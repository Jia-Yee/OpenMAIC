const BLOB_STORE_ID = process.env.BLOB_STORE_ID || 'store_dEn2beTlBFsQ3VGR';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function uploadClassroomData(classroomId: string, data: any): Promise<string> {
  if (!BLOB_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  const jsonData = JSON.stringify(data);
  const response = await fetch(`https://blob.vercel-storage.com/${BLOB_STORE_ID}/classrooms/${classroomId}.json`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${BLOB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: jsonData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload blob: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  return result.url;
}

export async function getClassroomData(classroomId: string): Promise<any | null> {
  if (!BLOB_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`https://blob.vercel-storage.com/${BLOB_STORE_ID}/classrooms/${classroomId}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error('Error fetching classroom data:', e);
    return null;
  }
}

export async function deleteClassroomData(classroomId: string): Promise<void> {
  if (!BLOB_TOKEN) {
    return;
  }

  await fetch(`https://blob.vercel-storage.com/${BLOB_STORE_ID}/classrooms/${classroomId}.json`, {
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
    const response = await fetch(`https://blob.vercel-storage.com/${BLOB_STORE_ID}?prefix=classrooms/`, {
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