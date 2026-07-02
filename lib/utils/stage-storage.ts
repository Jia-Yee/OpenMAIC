/**
 * Stage Storage Manager
 *
 * Manages multiple stage data in IndexedDB
 * Each stage has its own storage key based on stageId
 * Also syncs to server for cross-device access
 */

import { Stage, Scene } from '../types/stage';
import { ChatSession } from '../types/chat';
import { db } from './database';
import { saveChatSessions, loadChatSessions, deleteChatSessions } from './chat-storage';
import { clearPlaybackState } from './playback-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('StageStorage');

/**
 * Sync stage data to server for cross-device access
 */
async function syncStageToServer(stageId: string, data: StageStoreData): Promise<void> {
  try {
    // Deep copy the data to avoid modifying original
    const syncData = JSON.parse(JSON.stringify(data));
    
    // Build manifest with audio URLs
    const manifest: {
      stage: any;
      scenes: any[];
      mediaIndex: Record<string, { type: string; mimeType: string; missing: boolean }>;
    } = {
      stage: syncData.stage,
      scenes: syncData.scenes,
      mediaIndex: {},
    };
    
    // Prepare audio files for upload
    const audioFilesForUpload: { path: string; content: ArrayBuffer; mimeType: string }[] = [];
    
    for (const scene of syncData.scenes) {
      if (scene.actions) {
        for (const action of scene.actions) {
          if (action.type === 'speech' && action.audioId) {
            try {
              const audioFile = await db.audioFiles.get(action.audioId);
              if (audioFile && audioFile.blob) {
                const arrayBuffer = await audioFile.blob.arrayBuffer();
                const audioPath = `media/${action.audioId}.${audioFile.format || 'mp3'}`;
                audioFilesForUpload.push({
                  path: audioPath,
                  content: arrayBuffer,
                  mimeType: `audio/${audioFile.format || 'mp3'}`,
                });
                manifest.mediaIndex[audioPath] = {
                  type: 'audio',
                  mimeType: `audio/${audioFile.format || 'mp3'}`,
                  missing: false,
                };
              }
            } catch (error) {
              log.warn(`Failed to load audio for action ${action.audioId}:`, error);
            }
          }
        }
      }
    }
    
    // Build files list with manifest
    const filesForUpload: { path: string; content: string | ArrayBuffer; mimeType: string }[] = [
      {
        path: 'manifest.json',
        content: JSON.stringify(manifest),
        mimeType: 'application/json',
      },
      ...audioFilesForUpload,
    ];
    
    // Convert ArrayBuffer to base64 for JSON transport
    const filesForJson = filesForUpload.map((f) => {
      if (f.content instanceof ArrayBuffer) {
        const bytes = new Uint8Array(f.content);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return {
          path: f.path,
          mimeType: f.mimeType,
          contentBase64: btoa(binary),
        };
      }
      return {
        path: f.path,
        mimeType: f.mimeType,
        content: f.content,
      };
    });

    const formData = new FormData();
    formData.append('id', stageId);
    formData.append('name', syncData.stage.name || '未命名课堂');
    formData.append('description', syncData.stage.description || 'AI 生成的交互式课堂');
    formData.append('sceneCount', syncData.scenes?.length?.toString() || '0');
    formData.append('manifest', new Blob([JSON.stringify(manifest)], { type: 'application/json' }), 'manifest.json');

    for (const audioFile of audioFilesForUpload) {
      formData.append('files', new Blob([audioFile.content], { type: audioFile.mimeType }), audioFile.path);
    }

    const response = await fetch(`/api/classrooms/${stageId}/folder`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      log.info(`Synced stage to server: ${stageId}`);
    } else {
      log.warn(`Failed to sync stage to server: ${result.message}`);
    }
  } catch (error) {
    // Don't throw - server sync is optional
    log.warn(`Server sync failed for stage ${stageId}:`, error);
  }
}

export interface StageStoreData {
  stage: Stage;
  scenes: Scene[];
  currentSceneId: string | null;
  chats: ChatSession[];
}

export interface StageListItem {
  id: string;
  name: string;
  description?: string;
  sceneCount: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Save stage data to IndexedDB
 */
export async function saveStageData(stageId: string, data: StageStoreData): Promise<void> {
  try {
    const now = Date.now();

    // Save to stages table
    await db.stages.put({
      id: stageId,
      name: data.stage.name || 'Untitled Stage',
      description: data.stage.description,
      createdAt: data.stage.createdAt || now,
      updatedAt: now,
      languageDirective: data.stage.languageDirective,
      style: data.stage.style,
      currentSceneId: data.currentSceneId || undefined,
      agentIds: data.stage.agentIds,
    });

    // Delete old scenes first to avoid orphaned data
    await db.scenes.where('stageId').equals(stageId).delete();

    // Save new scenes
    if (data.scenes && data.scenes.length > 0) {
      await db.scenes.bulkPut(
        data.scenes.map((scene, index) => ({
          ...scene,
          stageId,
          order: scene.order ?? index,
          createdAt: scene.createdAt || now,
          updatedAt: scene.updatedAt || now,
        })),
      );
    }

    // Save chat sessions to independent table
    if (data.chats) {
      await saveChatSessions(stageId, data.chats);
    }

    log.info(`Saved stage: ${stageId}`);

    // Sync to server for cross-device access
    await syncStageToServer(stageId, data);
  } catch (error) {
    log.error('Failed to save stage:', error);
    throw error;
  }
}

/**
 * Load stage data from IndexedDB
 */
export async function loadStageData(stageId: string): Promise<StageStoreData | null> {
  try {
    // Load stage
    const stage = await db.stages.get(stageId);
    if (!stage) {
      log.info(`Stage not found: ${stageId}`);
      return null;
    }

    // Load scenes
    const scenes = await db.scenes.where('stageId').equals(stageId).sortBy('order');

    // Load chat sessions from independent table
    const chats = await loadChatSessions(stageId);

    log.info(`Loaded stage: ${stageId}, scenes: ${scenes.length}, chats: ${chats.length}`);

    return {
      stage,
      scenes,
      currentSceneId: stage.currentSceneId || scenes[0]?.id || null,
      chats,
    };
  } catch (error) {
    log.error('Failed to load stage:', error);
    return null;
  }
}

/**
 * Delete stage and all related data
 */
export async function deleteStageData(stageId: string): Promise<void> {
  try {
    // Delete stage
    await db.stages.delete(stageId);

    // Delete scenes
    await db.scenes.where('stageId').equals(stageId).delete();

    // Delete chat sessions and playback state
    await deleteChatSessions(stageId);
    await clearPlaybackState(stageId);

    log.info(`Deleted stage: ${stageId}`);
  } catch (error) {
    log.error('Failed to delete stage:', error);
    throw error;
  }
}

/**
 * List all stages
 */
export async function listStages(): Promise<StageListItem[]> {
  try {
    const stages = await db.stages.orderBy('updatedAt').reverse().toArray();

    // If IndexedDB has data, return it
    if (stages.length > 0) {
      const stageList: StageListItem[] = await Promise.all(
        stages.map(async (stage) => {
          const sceneCount = await db.scenes.where('stageId').equals(stage.id).count();

          return {
            id: stage.id,
            name: stage.name,
            description: stage.description,
            sceneCount,
            createdAt: stage.createdAt,
            updatedAt: stage.updatedAt,
          };
        }),
      );

      return stageList;
    }

    // IndexedDB is empty — try loading from server API
    log.info('IndexedDB empty, loading classrooms from server...');
    const serverStages = await listStagesFromServer();
    return serverStages;
  } catch (error) {
    log.error('Failed to list stages:', error);
    return [];
  }
}

/**
 * List stages from server-side storage (local files / R2 / Vercel Blob)
 * Also hydrates full classroom data into IndexedDB
 */
async function listStagesFromServer(): Promise<StageListItem[]> {
  try {
    const res = await fetch('/api/admin/classrooms');
    if (!res.ok) return [];
    const data = await res.json();
    const classrooms = data.classrooms || [];

    // Hydrate into IndexedDB: load full data for each classroom
    const stageList: StageListItem[] = [];
    for (const c of classrooms) {
      try {
        // Write stage metadata
        await db.stages.put({
          id: c.id,
          name: c.name || '未命名课堂',
          description: c.description,
          createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt).getTime() : Date.now(),
        });

        // Check if scenes already exist in IndexedDB
        const existingScenes = await db.scenes.where('stageId').equals(c.id).count();
        if (existingScenes === 0) {
          // Load full classroom data from server and hydrate scenes
          try {
            const detailRes = await fetch(`/api/classroom?id=${encodeURIComponent(c.id)}`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.classroom) {
                const classroomData = detailData.classroom;
                const stage = classroomData.stage || classroomData.data?.stage;
                const scenes = classroomData.scenes || classroomData.data?.scenes || [];

                if (stage) {
                  await db.stages.update(c.id, {
                    name: stage.name || c.name,
                    description: stage.description || c.description,
                    currentSceneId: scenes[0]?.id || null,
                  });
                }

                for (const scene of scenes) {
                  await db.scenes.put({
                    id: scene.id,
                    stageId: c.id,
                    type: scene.type || scene.content?.type || 'slide',
                    title: scene.title || '',
                    order: scene.order ?? 0,
                    content: scene.content,
                    actions: scene.actions || [],
                    createdAt: scene.createdAt || Date.now(),
                    updatedAt: scene.updatedAt || Date.now(),
                  });
                }
                log.info(`Hydrated ${scenes.length} scenes for ${c.id}`);
              }
            }
          } catch (e) {
            log.warn(`Failed to hydrate scenes for ${c.id}:`, e);
          }
        }

        // Get actual scene count from IndexedDB
        const sceneCount = await db.scenes.where('stageId').equals(c.id).count();
        stageList.push({
          id: c.id,
          name: c.name || '未命名课堂',
          description: c.description,
          sceneCount,
          createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt).getTime() : Date.now(),
        });
      } catch (e) {
        log.warn(`Failed to hydrate classroom ${c.id}:`, e);
        stageList.push({
          id: c.id,
          name: c.name || '未命名课堂',
          description: c.description,
          sceneCount: c.sceneCount || 0,
          createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt).getTime() : Date.now(),
        });
      }
    }

    return stageList;
  } catch (error) {
    log.warn('Failed to load stages from server:', error);
    return [];
  }
}

/**
 * Get first slide scene's canvas data for each stage (for thumbnail preview).
 * Also resolves gen_img_* placeholders from mediaFiles so thumbnails show real images.
 * Returns a map of stageId -> Slide (canvas data with resolved images)
 */
export async function getFirstSlideByStages(
  stageIds: string[],
): Promise<Record<string, import('../types/slides').Slide>> {
  const result: Record<string, import('../types/slides').Slide> = {};
  try {
    await Promise.all(
      stageIds.map(async (stageId) => {
        const scenes = await db.scenes.where('stageId').equals(stageId).sortBy('order');
        const firstSlide = scenes.find((s) => s.content?.type === 'slide');
        if (firstSlide && firstSlide.content.type === 'slide') {
          const slide = structuredClone(firstSlide.content.canvas);

          // Resolve gen_img_* placeholders from mediaFiles
          const placeholderEls = slide.elements.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (el: any) => el.type === 'image' && /^gen_(img|vid)_[\w-]+$/i.test(el.src as string),
          );
          if (placeholderEls.length > 0) {
            const mediaRecords = await db.mediaFiles.where('stageId').equals(stageId).toArray();
            const mediaMap = new Map(
              mediaRecords.map((r) => {
                // Key format: stageId:elementId → extract elementId
                const elementId = r.id.includes(':') ? r.id.split(':').slice(1).join(':') : r.id;
                return [elementId, r.blob] as const;
              }),
            );
            for (const el of placeholderEls as Array<{ src: string }>) {
              const blob = mediaMap.get(el.src);
              if (blob) {
                el.src = URL.createObjectURL(blob);
              } else {
                // Clear unresolved placeholder so BaseImageElement won't subscribe
                // to the global media store (which may have stale data from another course)
                el.src = '';
              }
            }
          }

          result[stageId] = slide;
        }
      }),
    );
  } catch (error) {
    log.error('Failed to load thumbnails:', error);
  }
  return result;
}

/**
 * Rename a stage (updates only the name field in IndexedDB)
 */
export async function renameStage(stageId: string, newName: string): Promise<void> {
  try {
    await db.stages.update(stageId, { name: newName, updatedAt: Date.now() });
    log.info(`Renamed stage ${stageId} to "${newName}"`);
  } catch (error) {
    log.error('Failed to rename stage:', error);
    throw error;
  }
}

/**
 * Check if stage exists
 */
export async function stageExists(stageId: string): Promise<boolean> {
  try {
    const stage = await db.stages.get(stageId);
    return !!stage;
  } catch (error) {
    log.error('Failed to check stage existence:', error);
    return false;
  }
}
