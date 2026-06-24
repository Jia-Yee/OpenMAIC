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

function isR2Available(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ENDPOINT
  );
}

async function getR2Module(): Promise<any> {
  if (isR2Available()) {
    const r2 = await import('./r2-storage');
    return r2;
  }
  return null;
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
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.uploadClassroomData(classroomId, data);
  }

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

  throw new Error('Storage not available. Either R2 or Vercel Blob must be configured.');
}

export async function getClassroomData(classroomId: string): Promise<any | null> {
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.getClassroomData(classroomId);
  }

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

export async function uploadMediaFile(classroomId: string, mediaId: string, dataUrlOrBlobUrl: string): Promise<string> {
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.uploadMediaFile(classroomId, mediaId, dataUrlOrBlobUrl);
  }

  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (blobModule && token) {
    let blob: Blob;
    
    // Check if it's a data URL
    if (dataUrlOrBlobUrl.startsWith('data:')) {
      blob = dataUrlToBlob(dataUrlOrBlobUrl);
    } 
    // Check if it's a Vercel Blob URL (requires Authorization header)
    else if (dataUrlOrBlobUrl.includes('.blob.vercel-storage.com') || dataUrlOrBlobUrl.includes('.vercel-storage.com')) {
      console.log(`Downloading Vercel Blob media: ${mediaId}`);
      const response = await fetch(dataUrlOrBlobUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download Vercel Blob media: ${response.status}`);
      }
      
      blob = await response.blob();
    }
    // Check if it's an external URL (like open.maic.chat, viete.xyz, vercel.app)
    else if (dataUrlOrBlobUrl.startsWith('http://') || dataUrlOrBlobUrl.startsWith('https://')) {
      console.log(`Downloading external media: ${mediaId} from ${dataUrlOrBlobUrl.substring(0, 50)}...`);
      const response = await fetch(dataUrlOrBlobUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download external media: ${response.status}`);
      }
      
      blob = await response.blob();
    }
    else {
      throw new Error(`Unsupported media URL format: ${dataUrlOrBlobUrl.substring(0, 50)}...`);
    }
    
    const path = `classrooms/${classroomId}/media/${mediaId}`;
    const { url } = await blobModule.put(path, blob, {
      access: 'private',
      token: token,
      allowOverwrite: true,
    });
    return url;
  }

  throw new Error('Storage not available. Either R2 or Vercel Blob must be configured.');
}

export async function getMediaFile(classroomId: string, mediaId: string): Promise<string | null> {
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.getMediaFile(classroomId, mediaId);
  }

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
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.listClassroomMedia(classroomId);
  }

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
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.deleteClassroomData(classroomId);
  }

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

export async function deleteClassroomFiles(classroomId: string, filePaths: string[]): Promise<void> {
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.deleteClassroomFiles(classroomId, filePaths);
  }

  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (blobModule && token) {
    for (const filePath of filePaths) {
      await blobModule.del(`classrooms/${classroomId}/${filePath}`, {
        token: token,
      });
    }
  }
}

export async function listClassroomFiles(): Promise<string[]> {
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.listClassroomFiles();
  }

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

export interface ClassroomFileEntry {
  path: string;
  content: string | ArrayBuffer | Buffer;
  mimeType: string;
}

export async function uploadClassroomFolder(
  classroomId: string,
  files: ClassroomFileEntry[]
): Promise<string[]> {
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.uploadClassroomFolder(classroomId, files);
  }

  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (!blobModule || !token) {
    throw new Error('Storage not available. Either R2 or Vercel Blob must be configured.');
  }

  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    const blobPath = `classrooms/${classroomId}/${file.path}`;
    
    let body: string | Blob;
    
    if (file.content instanceof ArrayBuffer) {
      body = new Blob([file.content], { type: file.mimeType });
    } else if (typeof file.content === 'string' && file.content.length > 0) {
      body = file.content;
    } else {
      console.error(`[BlobStorage] File has no content: ${file.path}`, {
        hasContent: 'content' in file,
        contentType: typeof file.content,
        keys: Object.keys(file),
      });
      throw new Error(`File ${file.path} has no content`);
    }
    
    const { url } = await blobModule.put(blobPath, body, {
      access: 'private',
      token: token,
      allowOverwrite: true,
      addRandomSuffix: false,
    }).catch((putError: any) => {
      if (putError?.message?.includes('suspended')) {
        throw new Error(`Vercel Blob storage is suspended. Please check your Vercel dashboard (https://vercel.com/dashboard/storage) to resume the Blob storage service. Error: ${putError.message}`);
      }
      throw putError;
    });
    
    uploadedUrls.push(url);
    console.log(`[BlobStorage] Uploaded file: ${blobPath}`);
  }
  
  console.log(`[BlobStorage] Uploaded ${uploadedUrls.length} files for classroom: ${classroomId}`);
  return uploadedUrls;
}

export async function getClassroomFile(
  classroomId: string,
  filePath: string
): Promise<{ blob: Blob; mimeType: string } | null> {
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.getClassroomFile(classroomId, filePath);
  }

  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (!blobModule || !token) {
    console.log(`[BlobStorage] Cannot get file: blobModule=${!!blobModule}, token=${!!token}`);
    return null;
  }

  const blobPath = `classrooms/${classroomId}/${filePath}`;

  try {
    const result = await blobModule.get(blobPath, {
      access: 'private',
      token: token,
    });
    
    if (!result) {
      console.log(`[BlobStorage] File not found: ${blobPath}`);
      return null;
    }
    
    if (result.statusCode !== 200) {
      console.log(`[BlobStorage] File fetch failed: ${blobPath}, status: ${result.statusCode}`);
      return null;
    }
    
    const stream = result.stream;
    if (!stream) {
      console.log(`[BlobStorage] No stream in response: ${blobPath}`);
      return null;
    }
    
    const mimeType = result.blob?.contentType || 'application/octet-stream';
    const size = result.blob?.size;
    
    console.log(`[BlobStorage] Fetching stream: ${blobPath}, mime: ${mimeType}, size: ${size}`);
    
    // Convert stream to Blob
    const blob = await new Response(stream).blob();
    
    console.log(`[BlobStorage] Successfully fetched: ${blobPath}, size: ${blob.size}`);
    return { blob, mimeType };
  } catch (error) {
    console.error(`[BlobStorage] Error getting file ${filePath}:`, error);
    return null;
  }
}

export async function listClassroomFolder(classroomId: string): Promise<string[]> {
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.listClassroomFolder(classroomId);
  }

  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (!blobModule || !token) {
    return [];
  }

  const { blobs } = await blobModule.list({
    prefix: `classrooms/${classroomId}/`,
    token: token,
  });
  
  return blobs
    .filter((blob: any) => blob && blob.path)
    .map((blob: any) => blob.path.replace(`classrooms/${classroomId}/`, ''));
}