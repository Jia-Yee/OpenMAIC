import type { Scene, Stage } from '@/lib/types/stage';
import type { PPTImageElement, PPTVideoElement, PPTAudioElement, PPTElement } from '@/lib/types/slides';

export interface MediaFile {
  id: string;
  src: string;
  type: 'image' | 'video' | 'audio';
  filename: string;
}

// Check if URL is a Vercel Blob URL or external media server URL
function isBlobUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('.vercel-storage.com') || 
         url.includes('open.maic.chat') ||
         url.includes('viete.xyz') ||
         url.includes('vercel.app');
}

export function extractMediaFromClassroom(data: {
  stage: Stage;
  scenes: Scene[];
}): MediaFile[] {
  const mediaFiles: MediaFile[] = [];

  const extractFromElements = (elements: PPTElement[]) => {
    for (const element of elements) {
      if (element.type === 'image') {
        const imgElement = element as PPTImageElement;
        // 提取所有类型的图片 URL：data URL、Blob URL、外部 HTTP/HTTPS URL
        if (imgElement.src) {
          if (imgElement.src.startsWith('data:')) {
            const ext = getExtensionFromDataUrl(imgElement.src) || 'png';
            mediaFiles.push({
              id: element.id,
              src: imgElement.src,
              type: 'image',
              filename: `${element.id}.${ext}`,
            });
          } else if (imgElement.src.startsWith('http://') || imgElement.src.startsWith('https://')) {
            const ext = getExtensionFromDataUrl(imgElement.src) || 'png';
            mediaFiles.push({
              id: element.id,
              src: imgElement.src,
              type: 'image',
              filename: `${element.id}.${ext}`,
            });
            console.log(`[MediaExtractor] Extracting external image URL for element ${element.id}: ${imgElement.src.substring(0, 50)}...`);
          }
        }
      } else if (element.type === 'video') {
        const videoElement = element as PPTVideoElement;
        if (videoElement.src && (videoElement.src.startsWith('data:') || isBlobUrl(videoElement.src))) {
          const ext = videoElement.ext || getExtensionFromDataUrl(videoElement.src) || 'mp4';
          mediaFiles.push({
            id: element.id,
            src: videoElement.src,
            type: 'video',
            filename: `${element.id}.${ext}`,
          });
        }
      } else if (element.type === 'audio') {
        const audioElement = element as PPTAudioElement;
        if (audioElement.src && (audioElement.src.startsWith('data:') || isBlobUrl(audioElement.src))) {
          const ext = audioElement.ext || getExtensionFromDataUrl(audioElement.src) || 'mp3';
          mediaFiles.push({
            id: element.id,
            src: audioElement.src,
            type: 'audio',
            filename: `${element.id}.${ext}`,
          });
        }
      }
    }
  };

  const extractFromActions = (actions: any[]) => {
    for (const action of actions) {
      if (action.type === 'speech') {
        const audioId = action.audioId || action.id;
        if (audioId && action.audioUrl) {
          // 提取所有类型的音频 URL：data URL、Blob URL、外部 HTTP/HTTPS URL
          if (action.audioUrl.startsWith('data:')) {
            const ext = getExtensionFromDataUrl(action.audioUrl) || 'mp3';
            mediaFiles.push({
              id: audioId,
              src: action.audioUrl,
              type: 'audio',
              filename: `${audioId}.${ext}`,
            });
          } else if (action.audioUrl.startsWith('http://') || action.audioUrl.startsWith('https://')) {
            // 所有外部 HTTP/HTTPS URL 都应该被提取和上传
            const ext = getExtensionFromDataUrl(action.audioUrl) || 'mp3';
            mediaFiles.push({
              id: audioId,
              src: action.audioUrl,
              type: 'audio',
              filename: `${audioId}.${ext}`,
            });
            console.log(`[MediaExtractor] Extracting external audio URL for action ${audioId}: ${action.audioUrl.substring(0, 50)}...`);
          }
        } else if (audioId && !action.audioUrl) {
          console.warn(`[MediaExtractor] Speech action has audioId but no audioUrl: ${audioId}`);
        }
      }
    }
  };

  for (const scene of data.scenes) {
    if (scene.content.type === 'slide' && scene.content.canvas) {
      extractFromElements(scene.content.canvas.elements || []);
    }
    if (scene.whiteboards) {
      for (const wb of scene.whiteboards) {
        extractFromElements(wb.elements || []);
      }
    }
    if (scene.actions) {
      extractFromActions(scene.actions);
    }
  }

  if (data.stage.whiteboard) {
    for (const wb of data.stage.whiteboard) {
      extractFromElements(wb.elements || []);
    }
  }

  return mediaFiles;
}

function getExtensionFromDataUrl(dataUrl: string): string {
  // 先尝试从 URL 路径提取扩展名
  const urlMatch = dataUrl.match(/\.(\w+)(?:\?|#|$)/);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }
  
  // 尝试从 data URL 提取扩展名
  const match = dataUrl.match(/^data:([^;]+);/);
  if (match) {
    const mimeType = match[1].toLowerCase();
    if (mimeType.includes('image/')) {
      return mimeType.replace('image/', '');
    } else if (mimeType.includes('video/')) {
      return mimeType.replace('video/', '');
    } else if (mimeType.includes('audio/')) {
      return mimeType.replace('audio/', '');
    }
  }
  return 'bin';
}

export function replaceMediaUrlsInClassroom(
  data: { stage: Stage; scenes: Scene[] },
  mediaMap: Record<string, string>
): { stage: Stage; scenes: Scene[] } {
  const replaceInElements = (elements: PPTElement[]): PPTElement[] => {
    return elements.map((element) => {
      if (element.type === 'image') {
        const imgElement = element as PPTImageElement;
        // 替换所有类型的图片 URL：data URL、Blob URL、外部 HTTP/HTTPS URL
        if (imgElement.src && (imgElement.src.startsWith('data:') || 
            imgElement.src.startsWith('http://') || imgElement.src.startsWith('https://'))) {
          const newSrc = mediaMap[element.id];
          if (newSrc) {
            return { ...imgElement, src: newSrc };
          }
        }
      } else if (element.type === 'video') {
        const videoElement = element as PPTVideoElement;
        // 替换所有类型的视频 URL
        if (videoElement.src && (videoElement.src.startsWith('data:') || 
            videoElement.src.startsWith('http://') || videoElement.src.startsWith('https://'))) {
          const newSrc = mediaMap[element.id];
          if (newSrc) {
            return { ...videoElement, src: newSrc };
          }
        }
      } else if (element.type === 'audio') {
        const audioElement = element as PPTAudioElement;
        // 替换所有类型的音频 URL
        if (audioElement.src && (audioElement.src.startsWith('data:') || 
            audioElement.src.startsWith('http://') || audioElement.src.startsWith('https://'))) {
          const newSrc = mediaMap[element.id];
          if (newSrc) {
            return { ...audioElement, src: newSrc };
          }
        }
      }
      return element;
    });
  };

  const replaceInActions = (actions: any[]): any[] => {
    return actions.map((action) => {
      if (action.type === 'speech' && action.audioUrl) {
        // 替换所有类型的音频 URL：data URL、Blob URL、外部 HTTP/HTTPS URL
        if (action.audioUrl.startsWith('data:') || 
            action.audioUrl.startsWith('http://') || 
            action.audioUrl.startsWith('https://')) {
          const audioId = action.audioId || action.id;
          const newSrc = mediaMap[audioId];
          if (newSrc) {
            return { ...action, audioUrl: newSrc };
          }
        }
      }
      return action;
    });
  };

  const newScenes = data.scenes.map((scene) => {
    let newScene = { ...scene };
    
    if (scene.content.type === 'slide' && scene.content.canvas) {
      newScene.content = {
        ...scene.content,
        canvas: {
          ...scene.content.canvas,
          elements: replaceInElements(scene.content.canvas.elements || []),
        },
      };
    }
    
    if (scene.whiteboards) {
      newScene.whiteboards = scene.whiteboards.map((wb) => ({
        ...wb,
        elements: replaceInElements(wb.elements || []),
      }));
    }
    
    if (scene.actions) {
      newScene.actions = replaceInActions(scene.actions);
    }
    
    return newScene;
  });

  let newStage = { ...data.stage };
  if (data.stage.whiteboard) {
    newStage.whiteboard = data.stage.whiteboard.map((wb) => ({
      ...wb,
      elements: replaceInElements(wb.elements || []),
    }));
  }

  return { stage: newStage, scenes: newScenes };
}

function findMediaByAnyId(mediaData: Record<string, string>, id: string): string | undefined {
  if (mediaData[id]) {
    return mediaData[id];
  }
  for (const key of Object.keys(mediaData)) {
    if (key === id || key.startsWith(id + '.') || id.startsWith(key + '.')) {
      return mediaData[key];
    }
  }
  return undefined;
}

export function restoreMediaDataUrls(
  data: { stage: Stage; scenes: Scene[] },
  mediaData: Record<string, string>
): { stage: Stage; scenes: Scene[] } {
  const replaceInElements = (elements: PPTElement[]): PPTElement[] => {
    return elements.map((element) => {
      if (element && element.id && (element.type === 'image' || element.type === 'video' || element.type === 'audio')) {
        const mediaSrc = findMediaByAnyId(mediaData, element.id);
        if (mediaSrc) {
          return { ...element, src: mediaSrc };
        }
      }
      return element;
    });
  };

  const restoreActionAudio = (actions: any[]): any[] => {
    return actions.map((action) => {
      if (action.type === 'speech') {
        const audioId = action.audioId || action.id;
        if (audioId) {
          const audioSrc = findMediaByAnyId(mediaData, audioId);
          if (audioSrc) {
            return { ...action, audioUrl: audioSrc };
          }
        }
      }
      return action;
    });
  };

  const newScenes = data.scenes.map((scene) => {
    let newScene = { ...scene };
    
    if (scene.content.type === 'slide' && scene.content.canvas) {
      newScene.content = {
        ...scene.content,
        canvas: {
          ...scene.content.canvas,
          elements: replaceInElements(scene.content.canvas.elements || []),
        },
      };
    }
    
    if (scene.whiteboards) {
      newScene.whiteboards = scene.whiteboards.map((wb) => ({
        ...wb,
        elements: replaceInElements(wb.elements || []),
      }));
    }
    
    if (scene.actions) {
      newScene.actions = restoreActionAudio(scene.actions);
    }
    
    return newScene;
  });

  let newStage = { ...data.stage };
  if (data.stage.whiteboard) {
    newStage.whiteboard = data.stage.whiteboard.map((wb) => ({
      ...wb,
      elements: replaceInElements(wb.elements || []),
    }));
  }

  return { stage: newStage, scenes: newScenes };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const base64Data = parts[1];
  const byteString = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: mimeType });
}