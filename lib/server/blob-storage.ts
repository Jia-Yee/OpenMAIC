import { promises as fs } from 'fs';
import path from 'path';

const BLOB_STORE_ID = process.env.BLOB_STORE_ID || 'store_dEn2beTlBFsQ3VGR';

// Dev mode: store data locally instead of R2/Vercel Blob
const isDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data', 'classrooms');

async function ensureLocalDir(classroomId?: string) {
  const dir = classroomId ? path.join(LOCAL_DATA_DIR, classroomId) : LOCAL_DATA_DIR;
  await fs.mkdir(dir, { recursive: true });
}

// ==================== Remote Storage (R2 / Vercel Blob) ====================

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

// ==================== Public API ====================

export async function uploadClassroomData(classroomId: string, data: any): Promise<string> {
  // Dev: save to local file
  if (isDev) {
    await ensureLocalDir();
    const filePath = path.join(LOCAL_DATA_DIR, `${classroomId}.json`);
    await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
    console.log(`[LocalStorage] Saved classroom data: ${classroomId}`);
    return `local://${classroomId}`;
  }

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

/**
 * Normalize classroom data for getClassroomData:
 * Handles both Format A ({stage, scenes}) and Format B ({data: {stage, scenes}})
 */
function normalizeBlobData(raw: any): any {
  if (!raw) return null;

  // Format B: server format with data.stage / data.scenes
  if (raw.data && typeof raw.data === 'object') {
    const scenes = raw.data.scenes || [];
    if (scenes.length > 0) {
      console.log(`[normalizeBlobData] Using server format, ${scenes.length} scenes`);
      return { stage: raw.data.stage, scenes, ...raw.data };
    }
    // data.scenes is empty, check top-level
    if (raw.scenes && raw.scenes.length > 0) {
      return raw;
    }
    return { stage: raw.data.stage, scenes: [] };
  }

  // Format A: top-level stage/scenes
  return raw;
}

export async function getClassroomData(classroomId: string): Promise<any | null> {
  // Dev: read from local file — try {id}.json first, then folder/manifest.json
  if (isDev) {
    // Try standalone JSON file first
    try {
      const filePath = path.join(LOCAL_DATA_DIR, `${classroomId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const raw = JSON.parse(content);
      const data = normalizeBlobData(raw);
      if (data && data.scenes && data.scenes.length > 0) {
        console.log(`[LocalStorage] Read classroom data: ${classroomId} (${data.scenes.length} scenes)`);
        return data;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[LocalStorage] Error reading classroom data:', error);
      }
    }

    // Try folder manifest.json (uploaded via folder upload API)
    try {
      const manifestPath = path.join(LOCAL_DATA_DIR, classroomId, 'manifest.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const raw = JSON.parse(manifestContent);
      const data = normalizeBlobData(raw);
      if (data && data.scenes && data.scenes.length > 0) {
        console.log(`[LocalStorage] Read classroom data from manifest: ${classroomId} (${data.scenes.length} scenes)`);
        return data;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[LocalStorage] Error reading manifest:', error);
      }
    }

    // Last try: {id}.json even with empty scenes
    try {
      const filePath = path.join(LOCAL_DATA_DIR, `${classroomId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const raw = JSON.parse(content);
      const data = normalizeBlobData(raw);
      console.log(`[LocalStorage] Read classroom data (no scenes): ${classroomId}`);
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      return null;
    }
  }

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
  // Dev: save media to local folder
  if (isDev) {
    await ensureLocalDir(classroomId);
    const mediaDir = path.join(LOCAL_DATA_DIR, classroomId, 'media');
    await fs.mkdir(mediaDir, { recursive: true });

    let buffer: Buffer;
    let ext = '.bin';

    if (dataUrlOrBlobUrl.startsWith('data:')) {
      const parts = dataUrlOrBlobUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const base64Data = parts[1];
      buffer = Buffer.from(base64Data, 'base64');
      // Guess extension from mime type
      if (mimeType.startsWith('image/png')) ext = '.png';
      else if (mimeType.startsWith('image/jpeg')) ext = '.jpg';
      else if (mimeType.startsWith('image/webp')) ext = '.webp';
      else if (mimeType.startsWith('audio/')) ext = '.mp3';
    } else if (dataUrlOrBlobUrl.startsWith('http')) {
      const response = await fetch(dataUrlOrBlobUrl);
      if (!response.ok) throw new Error(`Failed to download media: ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      throw new Error(`Unsupported media URL format: ${dataUrlOrBlobUrl.substring(0, 50)}...`);
    }

    const filePath = path.join(mediaDir, `${mediaId}${ext}`);
    await fs.writeFile(filePath, buffer);
    console.log(`[LocalStorage] Saved media: ${classroomId}/media/${mediaId}${ext}`);
    return `local://${classroomId}/media/${mediaId}${ext}`;
  }

  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.uploadMediaFile(classroomId, mediaId, dataUrlOrBlobUrl);
  }

  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (blobModule && token) {
    let blob: Blob;
    
    if (dataUrlOrBlobUrl.startsWith('data:')) {
      blob = dataUrlToBlob(dataUrlOrBlobUrl);
    } else if (dataUrlOrBlobUrl.includes('.blob.vercel-storage.com') || dataUrlOrBlobUrl.includes('.vercel-storage.com')) {
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
    } else if (dataUrlOrBlobUrl.startsWith('http://') || dataUrlOrBlobUrl.startsWith('https://')) {
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
    
    const blobPath = `classrooms/${classroomId}/media/${mediaId}`;
    const { url } = await blobModule.put(blobPath, blob, {
      access: 'private',
      token: token,
      allowOverwrite: true,
    });
    return url;
  }

  throw new Error('Storage not available. Either R2 or Vercel Blob must be configured.');
}

export async function getMediaFile(classroomId: string, mediaId: string): Promise<string | null> {
  // Dev: read from local folder
  if (isDev) {
    try {
      const mediaDir = path.join(LOCAL_DATA_DIR, classroomId, 'media');
      const entries = await fs.readdir(mediaDir);
      const match = entries.find(f => f.startsWith(mediaId + '.') || f === mediaId);
      if (match) {
        const filePath = path.join(mediaDir, match);
        const buffer = await fs.readFile(filePath);
        const ext = path.extname(match).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.mp3') mimeType = 'audio/mpeg';
        else if (ext === '.mp4') mimeType = 'video/mp4';
        const base64 = buffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[LocalStorage] Error reading media:', error);
      }
    }
    return null;
  }

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
  // Dev: list local media folder
  if (isDev) {
    try {
      const mediaDir = path.join(LOCAL_DATA_DIR, classroomId, 'media');
      const entries = await fs.readdir(mediaDir);
      return entries.map(f => f.replace(/\.[^.]+$/, '')); // Return without extension
    } catch {
      return [];
    }
  }

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
  // Dev: delete local folder
  if (isDev) {
    try {
      const dir = path.join(LOCAL_DATA_DIR, classroomId);
      await fs.rm(dir, { recursive: true, force: true });
      const jsonFile = path.join(LOCAL_DATA_DIR, `${classroomId}.json`);
      await fs.unlink(jsonFile).catch(() => {});
      console.log(`[LocalStorage] Deleted classroom: ${classroomId}`);
    } catch (error) {
      console.error('[LocalStorage] Error deleting classroom:', error);
    }
    return;
  }

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
  // Dev: delete local files
  if (isDev) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(path.join(LOCAL_DATA_DIR, classroomId, filePath));
      } catch {}
    }
    return;
  }

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
  // Dev: list local classroom JSON files
  if (isDev) {
    try {
      await ensureLocalDir();
      const entries = await fs.readdir(LOCAL_DATA_DIR);
      return entries
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

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
  // Dev: save all files locally
  if (isDev) {
    await ensureLocalDir(classroomId);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const filePath = path.join(LOCAL_DATA_DIR, classroomId, file.path);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      if (file.content instanceof ArrayBuffer || Buffer.isBuffer(file.content)) {
        await fs.writeFile(filePath, Buffer.from(file.content as ArrayBuffer));
      } else if (typeof file.content === 'string') {
        await fs.writeFile(filePath, file.content, 'utf-8');
      } else {
        console.warn(`[LocalStorage] Skipping file with no content: ${file.path}`);
        continue;
      }

      uploadedUrls.push(`local://${classroomId}/${file.path}`);
    }

    console.log(`[LocalStorage] Saved ${uploadedUrls.length} files for classroom: ${classroomId}`);
    return uploadedUrls;
  }

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
  // Dev: read from local folder
  if (isDev) {
    try {
      const fullPath = path.join(LOCAL_DATA_DIR, classroomId, filePath);
      const buffer = await fs.readFile(fullPath);
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.json') mimeType = 'application/json';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.mp3') mimeType = 'audio/mpeg';
      return { blob: new Blob([buffer], { type: mimeType }), mimeType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[LocalStorage] Error reading file:', error);
      }
      return null;
    }
  }

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
    
    const blob = await new Response(stream).blob();
    
    console.log(`[BlobStorage] Successfully fetched: ${blobPath}, size: ${blob.size}`);
    return { blob, mimeType };
  } catch (error) {
    console.error(`[BlobStorage] Error getting file ${filePath}:`, error);
    return null;
  }
}

export async function listClassroomFolder(classroomId: string): Promise<string[]> {
  // Dev: list local folder
  if (isDev) {
    try {
      const dir = path.join(LOCAL_DATA_DIR, classroomId);
      const listDir = async (d: string, prefix: string = ''): Promise<string[]> => {
        const entries = await fs.readdir(d, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
          const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            files.push(...await listDir(path.join(d, entry.name), relPath));
          } else {
            files.push(relPath);
          }
        }
        return files;
      };
      return await listDir(dir);
    } catch {
      return [];
    }
  }

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
