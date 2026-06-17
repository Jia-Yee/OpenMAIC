import crypto from 'crypto';

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ENDPOINT
  );
}

function hmac(key: Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function signRequest(
  method: string,
  path: string,
  body: string | Buffer | ArrayBuffer | null = null,
  headers: Record<string, string> = {},
  queryString: string = ''
): Promise<Record<string, string>> {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  const bucketName = process.env.R2_BUCKET_NAME;
  
  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error('R2 credentials not configured');
  }

  const url = new URL(endpoint);
  const host = url.hostname;
  const region = 'auto';
  const service = 's3';
  const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const date = timestamp.substring(0, 8);

  let payloadHash: string;
  if (!body) {
    payloadHash = hash('');
  } else if (typeof body === 'string') {
    payloadHash = hash(body);
  } else if (body instanceof ArrayBuffer) {
    payloadHash = crypto.createHash('sha256').update(Buffer.from(body)).digest('hex');
  } else {
    payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  }

  const canonicalHeaders: Record<string, string> = {
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': timestamp,
    ...headers,
  };

  const sortedHeaderKeys = Object.keys(canonicalHeaders).sort();
  const canonicalHeadersStr = sortedHeaderKeys.map(key => `${key}:${canonicalHeaders[key]}`).join('\n') + '\n';
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method,
    `/${bucketName}${path}`,
    queryString,
    canonicalHeadersStr,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const kDate = hmac(Buffer.from(`AWS4${secretAccessKey}`), date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign).toString('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...canonicalHeaders,
    'Authorization': authorization,
  };
}

export async function uploadClassroomData(classroomId: string, data: any): Promise<string> {
  if (!isR2Configured()) {
    throw new Error('R2 storage not configured');
  }

  const path = `/classrooms/${classroomId}.json`;
  const body = JSON.stringify(data);
  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  const headers = await signRequest('PUT', path, body);

  const response = await fetch(`${endpoint}/${bucketName}${path}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: body,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    console.error(`[R2Storage] Upload failed, response body:`, bodyText);
    throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
  }

  const url = `${endpoint}/${bucketName}${path}`;
  console.log(`[R2Storage] Uploaded classroom data: ${url}`);
  return url;
}

export async function getClassroomData(classroomId: string): Promise<any | null> {
  if (!isR2Configured()) {
    return null;
  }

  const path = `/classrooms/${classroomId}.json`;
  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  try {
    const headers = await signRequest('GET', path);

    const response = await fetch(`${endpoint}/${bucketName}${path}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.log(`[R2Storage] Classroom data fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('[R2Storage] Fetched classroom data:', data ? Object.keys(data) : null);
    return data;
  } catch (error) {
    console.error('[R2Storage] Error getting classroom data:', error);
    return null;
  }
}

export async function uploadMediaFile(classroomId: string, mediaId: string, dataUrlOrBlobUrl: string): Promise<string> {
  if (!isR2Configured()) {
    throw new Error('R2 storage not configured');
  }

  let blob: Blob;

  if (dataUrlOrBlobUrl.startsWith('data:')) {
    const parts = dataUrlOrBlobUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const base64Data = parts[1];
    const byteString = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    blob = new Blob([uint8Array], { type: mimeType });
  } else if (dataUrlOrBlobUrl.startsWith('http://') || dataUrlOrBlobUrl.startsWith('https://')) {
    console.log(`[R2Storage] Downloading external media: ${mediaId} from ${dataUrlOrBlobUrl.substring(0, 50)}...`);
    const response = await fetch(dataUrlOrBlobUrl);

    if (!response.ok) {
      throw new Error(`Failed to download external media: ${response.status}`);
    }

    blob = await response.blob();
  } else {
    throw new Error(`Unsupported media URL format: ${dataUrlOrBlobUrl.substring(0, 50)}...`);
  }

  const path = `/classrooms/${classroomId}/media/${mediaId}`;
  const body = await blob.arrayBuffer();
  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  const headers = await signRequest('PUT', path, Buffer.from(body));

  const response = await fetch(`${endpoint}/${bucketName}${path}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': blob.type,
    },
    body: body,
  });

  if (!response.ok) {
    throw new Error(`R2 media upload failed: ${response.status} ${response.statusText}`);
  }

  const url = `${endpoint}/${bucketName}${path}`;
  console.log(`[R2Storage] Uploaded media: ${url}`);
  return url;
}

export async function getMediaFile(classroomId: string, mediaId: string): Promise<string | null> {
  if (!isR2Configured()) {
    return null;
  }

  const path = `/classrooms/${classroomId}/media/${mediaId}`;
  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  try {
    const headers = await signRequest('GET', path);

    const response = await fetch(`${endpoint}/${bucketName}${path}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.log(`[R2Storage] Media fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[R2Storage] Error getting media file:', error);
    return null;
  }
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
  if (!isR2Configured()) {
    throw new Error('R2 storage not configured');
  }

  const uploadedUrls: string[] = [];
  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  for (const file of files) {
    const path = `/classrooms/${classroomId}/${file.path}`;

    let body: Buffer;
    if (file.content instanceof Buffer) {
      body = file.content;
    } else if (file.content instanceof ArrayBuffer) {
      body = Buffer.from(file.content);
    } else {
      body = Buffer.from(file.content as string, 'utf-8');
    }
    
    const headers = await signRequest('PUT', path, body);

    const response = await fetch(`${endpoint}/${bucketName}${path}`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': file.mimeType,
      },
      body: body as BodyInit,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error(`[R2Storage] Upload failed for ${file.path}, status: ${response.status}, body:`, responseBody);
      throw new Error(`R2 upload failed for ${file.path}: ${response.status} ${response.statusText}`);
    }

    const url = `${endpoint}/${bucketName}${path}`;
    uploadedUrls.push(url);
    console.log(`[R2Storage] Uploaded file: ${path}`);
  }

  console.log(`[R2Storage] Uploaded ${uploadedUrls.length} files for classroom: ${classroomId}`);
  return uploadedUrls;
}

export async function getClassroomFile(
  classroomId: string,
  filePath: string
): Promise<{ blob: Blob; mimeType: string } | null> {
  if (!isR2Configured()) {
    return null;
  }

  const path = `/classrooms/${classroomId}/${filePath}`;
  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  try {
    const headers = await signRequest('GET', path);

    const response = await fetch(`${endpoint}/${bucketName}${path}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.log(`[R2Storage] File not found: ${path}, status: ${response.status}`);
      return null;
    }

    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    const blob = await response.blob();

    console.log(`[R2Storage] Successfully fetched: ${path}, size: ${blob.size}`);
    return { blob, mimeType };
  } catch (error) {
    console.error(`[R2Storage] Error getting file ${filePath}:`, error);
    return null;
  }
}

export async function listClassroomFolder(classroomId: string): Promise<string[]> {
  if (!isR2Configured()) {
    return [];
  }

  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  try {
    const encodedPrefix = encodeURIComponent(`classrooms/${classroomId}/`);
    const queryString = `list-type=2&prefix=${encodedPrefix}`;
    const headers = await signRequest('GET', '/', null, {}, queryString);

    const response = await fetch(`${endpoint}/${bucketName}/?${queryString}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      const body = await response.text();
      console.log(`[R2Storage] List folder failed: ${response.status} ${response.statusText}`);
      console.log(`[R2Storage] Response body:`, body);
      return [];
    }

    const xml = await response.text();
    const keys: string[] = [];
    const keyRegex = /<Key>(.+?)<\/Key>/g;
    let match;

    while ((match = keyRegex.exec(xml)) !== null) {
      const key = match[1];
      if (key.startsWith(`classrooms/${classroomId}/`)) {
        keys.push(key.replace(`classrooms/${classroomId}/`, ''));
      }
    }

    return keys;
  } catch (error) {
    console.error(`[R2Storage] Error listing folder ${classroomId}:`, error);
    return [];
  }
}

export async function deleteClassroomData(classroomId: string): Promise<void> {
  if (!isR2Configured()) {
    return;
  }

  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;
  const path = `/classrooms/${classroomId}.json`;

  try {
    const headers = await signRequest('DELETE', path);

    const response = await fetch(`${endpoint}/${bucketName}${path}`, {
      method: 'DELETE',
      headers: headers,
    });

    if (!response.ok) {
      console.log(`[R2Storage] Delete failed: ${response.status} ${response.statusText}`);
    }

    const files = await listClassroomFolder(classroomId);
    for (const file of files) {
      const fileHeaders = await signRequest('DELETE', `/classrooms/${classroomId}/${file}`);
      await fetch(`${endpoint}/${bucketName}/classrooms/${classroomId}/${file}`, {
        method: 'DELETE',
        headers: fileHeaders,
      });
    }
  } catch (error) {
    console.error('[R2Storage] Error deleting classroom:', error);
  }
}

export async function listClassroomFiles(): Promise<string[]> {
  if (!isR2Configured()) {
    return [];
  }

  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  try {
    const encodedPrefix = encodeURIComponent('classrooms/');
    const queryString = `list-type=2&prefix=${encodedPrefix}`;
    const headers = await signRequest('GET', '/', null, {}, queryString);

    const response = await fetch(`${endpoint}/${bucketName}/?${queryString}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.log(`[R2Storage] List classrooms failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const xml = await response.text();
    const keys: string[] = [];
    const keyRegex = /<Key>(.+?)<\/Key>/g;
    let match;

    while ((match = keyRegex.exec(xml)) !== null) {
      const key = match[1];
      if (key.startsWith('classrooms/') && key.endsWith('.json')) {
        keys.push(key.replace('classrooms/', '').replace('.json', ''));
      }
    }

    return keys;
  } catch (error) {
    console.error('[R2Storage] Error listing classrooms:', error);
    return [];
  }
}

export async function listClassroomMedia(classroomId: string): Promise<string[]> {
  if (!isR2Configured()) {
    return [];
  }

  const endpoint = process.env.R2_ENDPOINT!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  try {
    const encodedPrefix = encodeURIComponent(`classrooms/${classroomId}/media/`);
    const queryString = `list-type=2&prefix=${encodedPrefix}`;
    const headers = await signRequest('GET', '/', null, {}, queryString);

    const response = await fetch(`${endpoint}/${bucketName}/?${queryString}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.log(`[R2Storage] List media failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const xml = await response.text();
    const keys: string[] = [];
    const keyRegex = /<Key>(.+?)<\/Key>/g;
    let match;

    while ((match = keyRegex.exec(xml)) !== null) {
      const key = match[1];
      if (key.startsWith(`classrooms/${classroomId}/media/`)) {
        keys.push(key.replace(`classrooms/${classroomId}/media/`, ''));
      }
    }

    return keys;
  } catch (error) {
    console.error(`[R2Storage] Error listing media for ${classroomId}:`, error);
    return [];
  }
}

export { isR2Configured };
