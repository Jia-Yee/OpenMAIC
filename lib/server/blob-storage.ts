import { promises as fs } from 'fs';
import path from 'path';

// Storage strategy:
//   Write: R2 only (called by course management upload)
//   Read:  R2 first, dev falls back to local files
//   Production: no local file access at all
//
//   Studio save → classroom-storage.ts (dev: local file, prod: R2)
//   Course management upload → blob-storage.ts (R2 only)
const isDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data', 'classrooms');

async function ensureLocalDir(classroomId?: string) {
  const dir = classroomId ? path.join(LOCAL_DATA_DIR, classroomId) : LOCAL_DATA_DIR;
  await fs.mkdir(dir, { recursive: true });
}

// ==================== Remote Storage Helpers ====================

async function getBlobModule(): Promise<{ put: any; get: any; del: any; list: any } | null> {
  try {
    const blob = await import('@vercel/blob');
    return { put: blob.put, get: blob.get, del: blob.del, list: blob.list };
  } catch {
    try {
      const blob = require('@vercel/blob');
      return { put: blob.put, get: blob.get, del: blob.del, list: blob.list };
    } catch {
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
    return await import('./r2-storage');
  }
  return null;
}

// ==================== Local File Helpers (dev read-only) ====================

async function readLocalJson(classroomId: string): Promise<any | null> {
  try {
    const filePath = path.join(LOCAL_DATA_DIR, `${classroomId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[LocalStorage] Error reading classroom data:', error);
    }
  }

  try {
    const manifestPath = path.join(LOCAL_DATA_DIR, classroomId, 'manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[LocalStorage] Error reading manifest:', error);
    }
  }

  return null;
}

/** Normalize both Format A ({stage, scenes}) and Format B ({data: {stage, scenes}}) */
function normalizeData(raw: any): any {
  if (!raw) return null;
  if (raw.data && typeof raw.data === 'object') {
    const scenes = raw.data.scenes || [];
    if (scenes.length > 0) return { stage: raw.data.stage, scenes, ...raw.data };
    if (raw.scenes && raw.scenes.length > 0) return raw;
    return { stage: raw.data.stage, scenes: [] };
  }
  return raw;
}

async function readLocalMedia(classroomId: string, mediaId: string): Promise<string | null> {
  for (const subDir of ['media', 'audio']) {
    try {
      const dir = path.join(LOCAL_DATA_DIR, classroomId, subDir);
      const entries = await fs.readdir(dir);
      const match = entries.find(f => f.startsWith(mediaId + '.') || f === mediaId);
      if (match) {
        const buffer = await fs.readFile(path.join(dir, match));
        const ext = path.extname(match).toLowerCase();
        const mimeMap: Record<string, string> = {
          '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
          '.mp4': 'video/mp4',
        };
        const mimeType = mimeMap[ext] || 'application/octet-stream';
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    } catch {}
  }
  return null;
}

async function listLocalMedia(classroomId: string): Promise<string[]> {
  const results: string[] = [];
  for (const subDir of ['media', 'audio']) {
    try {
      const dir = path.join(LOCAL_DATA_DIR, classroomId, subDir);
      const entries = await fs.readdir(dir);
      results.push(...entries.map(f => f.replace(/\.[^.]+$/, '')));
    } catch {}
  }
  return results;
}

/** Write a single classroom JSON to local file (dev only, called from classroom-storage.ts) */
export async function writeLocalClassroomJson(classroomId: string, data: any): Promise<void> {
  if (!isDev) return;
  await ensureLocalDir();
  const filePath = path.join(LOCAL_DATA_DIR, `${classroomId}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[LocalStorage] Saved classroom data: ${classroomId}`);
}

// ==================== Public API ====================
// Upload: R2 only (no local dual-write) — called by course management upload
// Read:   R2 first, dev falls back to local, then Vercel Blob

export async function uploadClassroomData(classroomId: string, data: any): Promise<string> {
  // 1. Upload to R2
  const r2Module = await getR2Module();
  if (r2Module) {
    try {
      const url = await r2Module.uploadClassroomData(classroomId, data);
      console.log(`[R2] Uploaded classroom data: ${classroomId}`);
      return url;
    } catch (error) {
      console.warn(`[R2] Upload failed:`, error);
    }
  }

  // 2. Fallback to Vercel Blob
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    const { url } = await blobModule.put(`classrooms/${classroomId}.json`, JSON.stringify(data), {
      access: 'private', token, allowOverwrite: true,
    });
    return url;
  }

  throw new Error('Storage not available. R2 or Vercel Blob must be configured.');
}

export async function getClassroomData(classroomId: string): Promise<any | null> {
  // 1. Try R2
  const r2Module = await getR2Module();
  if (r2Module) {
    try {
      const data = await r2Module.getClassroomData(classroomId);
      if (data) {
        const normalized = normalizeData(data);
        if (normalized?.scenes?.length > 0) {
          console.log(`[R2] Read classroom data: ${classroomId} (${normalized.scenes.length} scenes)`);
          return normalized;
        }
      }
    } catch (error) {
      console.warn(`[R2] Read failed:`, error);
    }
  }

  // 2. Dev fallback: try local files
  if (isDev) {
    const raw = await readLocalJson(classroomId);
    if (raw) {
      const data = normalizeData(raw);
      if (data?.scenes?.length > 0) {
        console.log(`[LocalStorage] Read classroom data: ${classroomId} (${data.scenes.length} scenes)`);
        return data;
      }
    }
  }

  // 3. Try Vercel Blob
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  if (token && storeId) {
    try {
      const url = `https://${storeId.replace('store_', '')}.private.blob.vercel-storage.com/classrooms/${classroomId}.json`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        return normalizeData(data);
      }
    } catch (error) {
      console.error('[Blob] Read failed:', error);
    }
  }

  return null;
}

export async function uploadMediaFile(classroomId: string, mediaId: string, dataUrlOrBlobUrl: string): Promise<string> {
  // 1. Upload to R2
  const r2Module = await getR2Module();
  if (r2Module) {
    try {
      const url = await r2Module.uploadMediaFile(classroomId, mediaId, dataUrlOrBlobUrl);
      console.log(`[R2] Uploaded media: ${classroomId}/media/${mediaId}`);
      return url;
    } catch (error) {
      console.warn(`[R2] Upload failed:`, error);
    }
  }

  // 2. Fallback to Vercel Blob
  let buffer: Buffer | null = null;
  let mimeType = 'application/octet-stream';

  if (dataUrlOrBlobUrl.startsWith('data:')) {
    const parts = dataUrlOrBlobUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    buffer = Buffer.from(parts[1], 'base64');
  } else if (dataUrlOrBlobUrl.startsWith('http')) {
    const response = await fetch(dataUrlOrBlobUrl);
    if (!response.ok) throw new Error(`Failed to download media: ${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
    mimeType = response.headers.get('content-type') || mimeType;
  } else {
    throw new Error(`Unsupported media URL format: ${dataUrlOrBlobUrl.substring(0, 50)}...`);
  }

  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    const blob = new Blob([buffer as any], { type: mimeType });
    const blobPath = `classrooms/${classroomId}/media/${mediaId}`;
    const { url } = await blobModule.put(blobPath, blob, {
      access: 'private', token, allowOverwrite: true,
    });
    return url;
  }

  throw new Error('Storage not available. R2 or Vercel Blob must be configured.');
}

export async function getMediaFile(classroomId: string, mediaId: string): Promise<string | null> {
  // 1. Try R2
  const r2Module = await getR2Module();
  if (r2Module) {
    try {
      const result = await r2Module.getMediaFile(classroomId, mediaId);
      if (result) return result;
    } catch (error) {
      console.warn(`[R2] Get media failed:`, error);
    }
  }

  // 2. Dev fallback: try local files
  if (isDev) {
    const result = await readLocalMedia(classroomId, mediaId);
    if (result) return result;
  }

  // 3. Try Vercel Blob
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  if (token && storeId) {
    try {
      const url = `https://${storeId.replace('store_', '')}.private.blob.vercel-storage.com/classrooms/${classroomId}/media/${mediaId}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const blob = await response.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error('[Blob] Get media failed:', error);
    }
  }

  return null;
}

export async function listClassroomMedia(classroomId: string): Promise<string[]> {
  // 1. Try R2
  const r2Module = await getR2Module();
  if (r2Module) {
    try {
      const results = await r2Module.listClassroomMedia(classroomId);
      if (results.length > 0) return results;
    } catch (error) {
      console.warn(`[R2] List media failed:`, error);
    }
  }

  // 2. Dev fallback: list local files
  if (isDev) {
    const results = await listLocalMedia(classroomId);
    if (results.length > 0) return results;
  }

  // 3. Try Vercel Blob
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    try {
      const { blobs } = await blobModule.list({ prefix: `classrooms/${classroomId}/media/`, token });
      return blobs
        .filter((blob: any) => blob && blob.path)
        .map((blob: any) => blob.path.replace(`classrooms/${classroomId}/media/`, ''));
    } catch {}
  }

  return [];
}

export async function deleteClassroomData(classroomId: string): Promise<void> {
  // 1. Delete from R2
  const r2Module = await getR2Module();
  if (r2Module) {
    await r2Module.deleteClassroomData(classroomId);
  }

  // 2. Dev: also delete local
  if (isDev) {
    try {
      await fs.rm(path.join(LOCAL_DATA_DIR, classroomId), { recursive: true, force: true });
      await fs.unlink(path.join(LOCAL_DATA_DIR, `${classroomId}.json`)).catch(() => {});
      console.log(`[LocalStorage] Deleted classroom: ${classroomId}`);
    } catch (error) {
      console.error('[LocalStorage] Delete failed:', error);
    }
  }

  // 3. Also try Vercel Blob
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    await blobModule.del(`classrooms/${classroomId}.json`, { token });
    const mediaFiles = await listClassroomMedia(classroomId);
    for (const mediaId of mediaFiles) {
      await blobModule.del(`classrooms/${classroomId}/media/${mediaId}`, { token });
    }
  }
}

export async function deleteClassroomFiles(classroomId: string, filePaths: string[]): Promise<void> {
  // 1. Delete from R2
  const r2Module = await getR2Module();
  if (r2Module) {
    await r2Module.deleteClassroomFiles(classroomId, filePaths);
  }

  // 2. Dev: also delete local
  if (isDev) {
    for (const filePath of filePaths) {
      try { await fs.unlink(path.join(LOCAL_DATA_DIR, classroomId, filePath)); } catch {}
    }
  }

  // 3. Also try Vercel Blob
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    for (const filePath of filePaths) {
      await blobModule.del(`classrooms/${classroomId}/${filePath}`, { token });
    }
  }
}

export async function listClassroomFiles(): Promise<string[]> {
  // 1. Try R2
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.listClassroomFiles();
  }

  // 2. Dev fallback
  if (isDev) {
    try {
      await ensureLocalDir();
      const entries = await fs.readdir(LOCAL_DATA_DIR);
      return entries.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    } catch {}
  }

  // 3. Try Vercel Blob
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    const { blobs } = await blobModule.list({ prefix: 'classrooms/', token });
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
  // 1. Upload to R2
  const r2Module = await getR2Module();
  if (r2Module) {
    try {
      const urls = await r2Module.uploadClassroomFolder(classroomId, files);
      console.log(`[R2] Uploaded ${urls.length} files for classroom: ${classroomId}`);
      return urls;
    } catch (error) {
      console.warn(`[R2] Upload folder failed:`, error);
    }
  }

  // 2. Fallback to Vercel Blob
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const blobPath = `classrooms/${classroomId}/${file.path}`;
      let body: string | Blob;
      if (file.content instanceof ArrayBuffer) {
        body = new Blob([file.content], { type: file.mimeType });
      } else if (typeof file.content === 'string' && file.content.length > 0) {
        body = file.content;
      } else {
        throw new Error(`File ${file.path} has no content`);
      }
      const { url } = await blobModule.put(blobPath, body, {
        access: 'private', token, allowOverwrite: true,
      });
      uploadedUrls.push(url);
    }
    return uploadedUrls;
  }

  throw new Error('Storage not available. R2 or Vercel Blob must be configured.');
}

export async function getClassroomFile(
  classroomId: string,
  filePath: string
): Promise<{ blob: Blob; mimeType: string } | null> {
  // 1. Try R2
  const r2Module = await getR2Module();
  if (r2Module) {
    try {
      return await r2Module.getClassroomFile(classroomId, filePath);
    } catch (error) {
      console.warn(`[R2] Get file failed:`, error);
    }
  }

  // 2. Dev fallback: read local
  if (isDev) {
    try {
      const fullPath = path.join(LOCAL_DATA_DIR, classroomId, filePath);
      const buffer = await fs.readFile(fullPath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.json': 'application/json', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg',
      };
      const mimeType = mimeMap[ext] || 'application/octet-stream';
      return { blob: new Blob([buffer], { type: mimeType }), mimeType };
    } catch {}
  }

  // 3. Try Vercel Blob
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    try {
      const result = await blobModule.get(`classrooms/${classroomId}/${filePath}`, {
        access: 'private', token,
      });
      if (result && result.statusCode === 200 && result.stream) {
        const mimeType = result.blob?.contentType || 'application/octet-stream';
        const blob = await new Response(result.stream).blob();
        return { blob, mimeType };
      }
    } catch (error) {
      console.error('[Blob] Get file failed:', error);
    }
  }

  return null;
}

export async function listClassroomFolder(classroomId: string): Promise<string[]> {
  // 1. Try R2
  const r2Module = await getR2Module();
  if (r2Module) {
    return await r2Module.listClassroomFolder(classroomId);
  }

  // 2. Dev fallback: list local
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
    } catch {}
  }

  // 3. Try Vercel Blob
  const blobModule = await getBlobModule();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobModule && token) {
    const { blobs } = await blobModule.list({ prefix: `classrooms/${classroomId}/`, token });
    return blobs
      .filter((blob: any) => blob && blob.path)
      .map((blob: any) => blob.path.replace(`classrooms/${classroomId}/`, ''));
  }

  return [];
}
