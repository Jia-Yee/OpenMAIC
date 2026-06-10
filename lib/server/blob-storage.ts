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

export async function uploadClassroomData(classroomId: string, data: any): Promise<string> {
  const blobModule = await getBlobModule();
  
  if (blobModule) {
    const { url } = await blobModule.put(`classrooms/${classroomId}.json`, JSON.stringify(data), {
      access: 'private',
    });
    return url;
  }

  throw new Error('@vercel/blob module not available. This feature requires deployment to Vercel.');
}

export async function getClassroomData(classroomId: string): Promise<any | null> {
  const blobModule = await getBlobModule();
  
  if (blobModule) {
    const result = await blobModule.get(`classrooms/${classroomId}.json`);
    if (result.data) {
      return JSON.parse(await result.data.text());
    }
    return null;
  }

  return null;
}

export async function deleteClassroomData(classroomId: string): Promise<void> {
  const blobModule = await getBlobModule();
  
  if (blobModule) {
    await blobModule.del(`classrooms/${classroomId}.json`);
  }
}

export async function listClassroomFiles(): Promise<string[]> {
  const blobModule = await getBlobModule();
  
  if (blobModule) {
    const { blobs } = await blobModule.list({ prefix: 'classrooms/' });
    return blobs
      .filter((blob: any) => blob.path.endsWith('.json'))
      .map((blob: any) => blob.path.replace('classrooms/', '').replace('.json', ''));
  }

  return [];
}