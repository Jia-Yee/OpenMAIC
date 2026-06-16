import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { courses, grades, textbooks, subjects, classrooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { processClassroomMedia } from '@/lib/server/classroom-media-processor';
import { generateTTS } from '@/lib/audio/tts-providers';
import { resolveTTSApiKey, resolveTTSBaseUrl, getServerTTSProviders } from '@/lib/server/provider-config';
import { TTS_PROVIDERS, DEFAULT_TTS_VOICES } from '@/lib/audio/constants';
import type { TTSProviderId } from '@/lib/audio/types';

/**
 * POST /api/admin/classrooms/[id]/upload
 * Upload a single classroom with full data to server
 * 
 * Body: {
 *   id: string,
 *   name: string,
 *   description?: string,
 *   sceneCount: number,
 *   data: any (full classroom content including stage and scenes)
 * }
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    const body = await request.json();
    const { name, description, sceneCount, data } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'name is required',
      }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    let dataUrl = '';
    if (data && Object.keys(data).length > 0) {
      const processedData = await generateMissingAudio(data);
      
      const result = await processClassroomMedia(classroomId, processedData);
      dataUrl = result.dataUrl;
      console.log(`[AdminUpload] Media processing complete, uploaded ${Object.keys(result.mediaMap).length} media files`);
    }

    const db = await ensureDb();

    // 只保存元数据到 PostgreSQL
    await db.insert(classrooms).values({
      id: classroomId,
      name: name || 'Untitled',
      description: description,
      sceneCount: sceneCount || 0,
      dataUrl: dataUrl,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: classrooms.id,
      set: {
        name: name || 'Untitled',
        description: description,
        sceneCount: sceneCount || 0,
        dataUrl: dataUrl,
        updatedAt: now,
      },
    });

    // 确保课程记录存在
    const existingCourse = await db.select()
      .from(courses)
      .where(eq(courses.id, classroomId))
      .limit(1);

    if (existingCourse.length === 0) {
      let defaultGradeId = '';
      try {
        const mathSubject = await db.select()
          .from(subjects)
          .where(eq(subjects.code, 'math'))
          .limit(1);
        
        if (mathSubject.length > 0) {
          const textbook = await db.select()
            .from(textbooks)
            .where(eq(textbooks.subjectId, mathSubject[0].id))
            .limit(1);
          
          if (textbook.length > 0) {
            const grade = await db.select()
              .from(grades)
              .where(eq(grades.textbookId, textbook[0].id))
              .limit(1);
            
            if (grade.length > 0) {
              defaultGradeId = grade[0].id;
            }
          }
        }
        
        if (!defaultGradeId) {
          const anyGrade = await db.select().from(grades).limit(1);
          if (anyGrade.length > 0) {
            defaultGradeId = anyGrade[0].id;
          }
        }
      } catch (e) {
        console.error('Failed to get default grade:', e);
      }

      if (defaultGradeId) {
        await db.insert(courses).values({
          gradeId: defaultGradeId as any,
          title: name || 'Untitled',
          description: description || '',
          classroomId: classroomId,
          duration: 0,
          sortOrder: 0,
          isActive: 1,
          isFree: 0,
          createdAt: now,
        } as any);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Classroom ${classroomId} uploaded successfully`,
      id: classroomId,
    });
  } catch (error) {
    console.error('Error uploading classroom:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload classroom',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

async function generateMissingAudio(data: any): Promise<any> {
  // Resolve TTS provider from server config (excludes browser-native-tts)
  const serverTtsProviders = getServerTTSProviders();
  const ttsProviderIds = Object.keys(serverTtsProviders).filter(
    (id) => id !== 'browser-native-tts',
  );

  if (ttsProviderIds.length === 0) {
    console.warn('[generateMissingAudio] No server TTS provider configured, skipping TTS generation');
    return data;
  }

  const ttsProviderId = ttsProviderIds[0] as TTSProviderId;
  const ttsVoice = process.env.TTS_VOICE || DEFAULT_TTS_VOICES[ttsProviderId as keyof typeof DEFAULT_TTS_VOICES] || 'alloy';

  const apiKey = resolveTTSApiKey(ttsProviderId, undefined);
  const baseUrl = resolveTTSBaseUrl(ttsProviderId, undefined);

  if (!apiKey) {
    console.warn(`[generateMissingAudio] No API key for TTS provider "${ttsProviderId}", skipping TTS generation`);
    return data;
  }

  console.log(`[generateMissingAudio] Using TTS provider: ${ttsProviderId}, voice: ${ttsVoice}`);

  // 复制数据以避免修改原数据
  const newData = JSON.parse(JSON.stringify(data));

  let generatedCount = 0;
  let skippedCount = 0;

  if (newData.scenes) {
    for (const scene of newData.scenes) {
      if (scene.actions) {
        for (const action of scene.actions) {
          if (action.type === 'speech' && action.text && !action.audioUrl && !action.audioRef) {
            const audioId = action.audioId || action.id;
            if (audioId) {
              try {
                console.log(`Generating TTS for action ${audioId}...`);

                const config = {
                  providerId: ttsProviderId,
                  modelId: TTS_PROVIDERS[ttsProviderId as keyof typeof TTS_PROVIDERS]?.defaultModelId,
                  voice: ttsVoice,
                  speed: 1.0,
                  apiKey,
                  baseUrl,
                };

                const { audio, format } = await generateTTS(config as any, action.text);

                // 转换为 data URL
                const base64 = Buffer.from(audio).toString('base64');
                action.audioUrl = `data:audio/${format};base64,${base64}`;

                console.log(`Generated TTS for action ${audioId}`);
                generatedCount++;
              } catch (error) {
                console.error(`Failed to generate TTS for action ${audioId}:`, error);
                skippedCount++;
              }
            }
          }
        }
      }
    }
  }

  console.log(`[generateMissingAudio] Generated ${generatedCount} TTS files, skipped ${skippedCount}`);

  return newData;
}