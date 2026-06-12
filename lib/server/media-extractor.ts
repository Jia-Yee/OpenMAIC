import type { Scene, Stage } from '@/lib/types/stage';
import type { PPTImageElement, PPTVideoElement, PPTAudioElement, PPTElement } from '@/lib/types/slides';

export interface MediaFile {
  id: string;
  src: string;
  type: 'image' | 'video' | 'audio';
  filename: string;
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
        if (imgElement.src && imgElement.src.startsWith('data:')) {
          const ext = getExtensionFromDataUrl(imgElement.src);
          mediaFiles.push({
            id: element.id,
            src: imgElement.src,
            type: 'image',
            filename: `${element.id}.${ext}`,
          });
        }
      } else if (element.type === 'video') {
        const videoElement = element as PPTVideoElement;
        if (videoElement.src && videoElement.src.startsWith('data:')) {
          const ext = videoElement.ext || getExtensionFromDataUrl(videoElement.src);
          mediaFiles.push({
            id: element.id,
            src: videoElement.src,
            type: 'video',
            filename: `${element.id}.${ext}`,
          });
        }
      } else if (element.type === 'audio') {
        const audioElement = element as PPTAudioElement;
        if (audioElement.src && audioElement.src.startsWith('data:')) {
          const ext = audioElement.ext || getExtensionFromDataUrl(audioElement.src);
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
      if (action.type === 'speech' && action.audioUrl && action.audioUrl.startsWith('data:')) {
        const audioId = action.audioId || action.id;
        if (audioId) {
          const ext = getExtensionFromDataUrl(action.audioUrl);
          mediaFiles.push({
            id: audioId,
            src: action.audioUrl,
            type: 'audio',
            filename: `${audioId}.${ext}`,
          });
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
        if (imgElement.src && imgElement.src.startsWith('data:')) {
          const newSrc = mediaMap[element.id];
          if (newSrc) {
            return { ...imgElement, src: newSrc };
          }
        }
      } else if (element.type === 'video') {
        const videoElement = element as PPTVideoElement;
        if (videoElement.src && videoElement.src.startsWith('data:')) {
          const newSrc = mediaMap[element.id];
          if (newSrc) {
            return { ...videoElement, src: newSrc };
          }
        }
      } else if (element.type === 'audio') {
        const audioElement = element as PPTAudioElement;
        if (audioElement.src && audioElement.src.startsWith('data:')) {
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
      if (action.type === 'speech' && action.audioUrl && action.audioUrl.startsWith('data:')) {
        const audioId = action.audioId || action.id;
        const newSrc = mediaMap[audioId];
        if (newSrc) {
          return { ...action, audioUrl: newSrc };
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

export function restoreMediaDataUrls(
  data: { stage: Stage; scenes: Scene[] },
  mediaData: Record<string, string>
): { stage: Stage; scenes: Scene[] } {
  const replaceInElements = (elements: PPTElement[]): PPTElement[] => {
    return elements.map((element) => {
      if (element && element.id && (element.type === 'image' || element.type === 'video' || element.type === 'audio')) {
        const mediaSrc = mediaData[element.id];
        if (mediaSrc) {
          return { ...element, src: mediaSrc };
        }
      }
      return element;
    });
  };

  const restoreActionAudio = (actions: any[]): any[] => {
    return actions.map((action) => {
      if (action.type === 'speech' && action.audioId) {
        const audioSrc = mediaData[action.audioId];
        if (audioSrc) {
          return { ...action, audioUrl: audioSrc };
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