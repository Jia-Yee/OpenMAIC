import { NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/utils/database';
import type { SceneRecord } from '@/lib/utils/database';

// 确保数据库已初始化
let dbInitialized = false;

async function ensureDbInit() {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const classroomId = params.id;
    
    console.log('Fetching classroom from database:', classroomId);
    
    // 确保数据库已初始化
    await ensureDbInit();
    
    // 从 IndexedDB 获取课程信息
    const stage = await db.stages.get(classroomId);
    
    if (!stage) {
      return NextResponse.json({ 
        success: false,
        error: 'Course not found',
        message: `Course with ID "${classroomId}" does not exist in database`
      }, { status: 404 });
    }
    
    // 获取该课程的所有场景
    const sceneRecords = await db.scenes.where('stageId').equals(classroomId).sortBy('order');
    
    // 转换场景数据格式
    const scenes = sceneRecords.map((record: SceneRecord) => ({
      id: record.id,
      type: record.type,
      order: record.order,
      title: record.title,
      content: record.content,
      actions: record.actions || [],
      whiteboard: record.whiteboard || [],
    }));
    
    console.log(`Found ${scenes.length} scenes for classroom ${classroomId}`);
    
    // 返回课程详情（包含场景）
    return NextResponse.json({ 
      success: true,
      accessGranted: true,
      id: stage.id,
      title: stage.name,
      description: stage.description,
      accessType: 'public',
      price: undefined,
      trialEnabled: false,
      thumbnail: undefined,
      sceneCount: scenes.length,
      createdAt: new Date(stage.createdAt).toISOString(),
      updatedAt: new Date(stage.updatedAt).toISOString(),
      languageDirective: stage.languageDirective,
      style: stage.style,
      currentSceneId: stage.currentSceneId,
      agentIds: stage.agentIds,
      scenes: scenes
    });
  } catch (error) {
    console.error('Failed to fetch classroom:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch classroom',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
