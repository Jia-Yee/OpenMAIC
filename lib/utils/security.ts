const TRUSTED_IMAGE_ORIGINS = [
  /^https?:\/\/.*\.vercel-storage\.com/,
  /^https?:\/\/.*\.blob\.core\.windows\.net/,
  /^https?:\/\/localhost(:\d+)?\//,
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//,
  /^https?:\/\/0\.0\.0\.0(:\d+)?\//,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?\//,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?\//,
  /^data:/,
  /^blob:/,
];

export function isTrustedImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsedUrl = new URL(url);
    
    for (const originPattern of TRUSTED_IMAGE_ORIGINS) {
      if (originPattern.test(url)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return url.startsWith('data:') || url.startsWith('blob:');
  }
}

export function sanitizeImageUrl(url: string, fallbackUrl: string = '/api/placeholder-image'): string {
  if (!url || typeof url !== 'string') {
    return fallbackUrl;
  }
  
  if (isTrustedImageUrl(url)) {
    return url;
  }
  
  console.warn(`[Security] Blocked untrusted image URL: ${url}`);
  return fallbackUrl;
}

export function validateClassroomId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  const pattern = /^[a-zA-Z0-9_-]+$/;
  return pattern.test(id) && id.length <= 50;
}

export function validateMode(mode: string): boolean {
  const validModes = ['adventure', 'learning', 'practice', 'quiz'];
  return validModes.includes(mode);
}

export function validateSubjectId(id: string | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  const pattern = /^subject-[a-zA-Z0-9_-]+$/;
  return pattern.test(id) && id.length <= 50;
}

export function validateGradeId(id: string | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  const pattern = /^grade-[a-zA-Z0-9_-]+$/;
  return pattern.test(id) && id.length <= 50;
}

export function sanitizeSubjectName(name: string | null): string {
  if (!name || typeof name !== 'string') {
    return '数学冒险';
  }
  
  const sanitized = name.replace(/[<>\"'&]/g, '');
  return sanitized.length > 50 ? sanitized.substring(0, 50) : sanitized;
}