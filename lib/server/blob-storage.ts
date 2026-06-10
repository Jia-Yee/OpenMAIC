const BLOB_API_URL = 'https://api.vercel-storage.com/v1/blobs';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function uploadClassroomData(classroomId: string, data: any): Promise<string> {
  if (!BLOB_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  const jsonData = JSON.stringify(data);
  const response = await fetch(BLOB_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BLOB_TOKEN}`,
      'Content-Type': 'application/json',
      'x-vercel-filename': `${classroomId}.json`,
      'x-vercel-upload-type': 'blob',
    },
    body: jsonData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload blob: ${response.statusText}`);
  }

  const result = await response.json();
  return result.url;
}

export async function getClassroomData(classroomId: string): Promise<any | null> {
  if (!BLOB_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${BLOB_API_URL}/${classroomId}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function deleteClassroomData(classroomId: string): Promise<void> {
  if (!BLOB_TOKEN) {
    return;
  }

  await fetch(`${BLOB_API_URL}/${classroomId}.json`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${BLOB_TOKEN}`,
    },
  });
}

export async function listClassroomFiles(): Promise<string[]> {
  if (!BLOB_TOKEN) {
    return [];
  }

  try {
    const response = await fetch(`${BLOB_API_URL}?prefix=classrooms/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.blobs.map((blob: any) => 
      blob.pathname.replace('classrooms/', '').replace('.json', '')
    );
  } catch {
    return [];
  }
}