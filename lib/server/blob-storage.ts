const BLOB_STORE_ID = process.env.BLOB_STORE_ID || 'store_dEn2beTlBFsQ3VGR';

async function getBlobModule(): Promise<{ put: any; get: any; del: any; list: any } | null> {
  try {
    const blob = await import('@vercel/blob');
    return {
      put: blob.put,
      get: blob.get,
      del: blob.del,
      list: blob.list,
    };
  } catch (e) {
    try {
      const blob = require('@vercel/blob');
      return {
        put: blob.put,
        get: blob.get,
        del: blob.del,
        list: blob.list,
      };
    } catch {
      console.warn('@vercel/blob not available, will use when deployed to Vercel');
      return null;
    }
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
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

export async function uploadClassroomData(classroomId: string, data: any): Promise<string> {
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (blobModule && token) {
    const { url } = await blobModule.put(`classrooms/${classroomId}.json`, JSON.stringify(data), {
      access: 'private',
      token: token,
      allowOverwrite: true,
    });
    return url;
  }

  throw new Error('@vercel/blob module not available. This feature requires deployment to Vercel.');
}

export async function getClassroomData(classroomId: string): Promise<any | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  
  if (token && storeId) {
    try {
      const url = `https://${storeId.replace('store_', '')}.private.blob.vercel-storage.com/classrooms/${classroomId}.json`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched classroom data from Blob:', data ? Object.keys(data) : null);
        return data;
      } else {
        console.log('Blob fetch failed:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error getting classroom data from Blob:', error);
      return null;
    }
  }

  return null;
}

export async function uploadMediaFile(classroomId: string, mediaId: string, dataUrl: string): Promise<string> {
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (blobModule && token) {
    const blob = dataUrlToBlob(dataUrl);
    const path = `classrooms/${classroomId}/media/${mediaId}`;
    const { url } = await blobModule.put(path, blob, {
      access: 'private',
      token: token,
      allowOverwrite: true,
    });
    return url;
  }

  throw new Error('@vercel/blob module not available. This feature requires deployment to Vercel.');
}

export async function getMediaFile(classroomId: string, mediaId: string): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  
  if (token && storeId) {
    const url = `https://${storeId.replace('store_', '')}.private.blob.vercel-storage.com/classrooms/${classroomId}/media/${mediaId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } else {
      console.log('Media fetch failed:', response.status, response.statusText);
      return null;
    }
  }

  return null;
}

export async function listClassroomMedia(classroomId: string): Promise<string[]> {
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (blobModule && token) {
    const { blobs } = await blobModule.list({
      prefix: `classrooms/${classroomId}/media/`,
      token: token,
    });
    return blobs
      .filter((blob: any) => blob && blob.path)
      .map((blob: any) => blob.path.replace(`classrooms/${classroomId}/media/`, ''));
  }

  return [];
}

export async function deleteClassroomData(classroomId: string): Promise<void> {
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (blobModule && token) {
    await blobModule.del(`classrooms/${classroomId}.json`, {
      token: token,
    });
    
    const mediaFiles = await listClassroomMedia(classroomId);
    for (const mediaId of mediaFiles) {
      await blobModule.del(`classrooms/${classroomId}/media/${mediaId}`, {
        token: token,
      });
    }
  }
}

export async function listClassroomFiles(): Promise<string[]> {
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (blobModule && token) {
    const { blobs } = await blobModule.list({ 
      prefix: 'classrooms/',
      token: token,
    });
    return blobs
      .filter((blob: any) => blob.path.endsWith('.json'))
      .map((blob: any) => blob.path.replace('classrooms/', '').replace('.json', ''));
  }

  return [];
}