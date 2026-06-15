const TRUSTED_IMAGE_ORIGINS = [
  /^https?:\/\/.*\.vercel-storage\.com/,
  /^https?:\/\/.*\.blob\.core\.windows\.net/,
  /^https?:\/\/.*\.vercel\.app\//,
  /^https?:\/\/open\.maic\.chat\//,
  /^https?:\/\/www\.viete\.xyz\//,
  /^https?:\/\/viete\.xyz\//,
  /^https?:\/\/localhost(:\d+)?\//,
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//,
  /^https?:\/\/0\.0\.0\.0(:\d+)?\//,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?\//,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?\//,
  /^data:/,
  /^blob:/,
];

// 媒体 ID 格式：gen_img_xxx, gen_vid_xxx 等
const MEDIA_ID_PATTERN = /^(gen_img|gen_vid|gen_audio|media)_[a-zA-Z0-9_-]+$/;

export function isTrustedImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // 媒体 ID 是有效的（需要后续转换为完整 URL）
  if (MEDIA_ID_PATTERN.test(url)) {
    return true;
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
    // 相对路径或无效 URL
    return url.startsWith('data:') || url.startsWith('blob:') || MEDIA_ID_PATTERN.test(url);
  }
}

// 需要通过代理访问的外部域名
const PROXY_DOMAINS = ['open.maic.chat', 'www.viete.xyz', 'viete.xyz'];

export function sanitizeImageUrl(url: string, fallbackUrl: string = '/api/placeholder-image'): string {
  if (!url || typeof url !== 'string') {
    return fallbackUrl;
  }
  
  // 媒体 ID 需要转换为完整 URL（由调用方处理）
  if (MEDIA_ID_PATTERN.test(url)) {
    return url; // 返回原始 ID，让调用方处理
  }
  
  // 检查是否是需要代理的外部URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const isProxyDomain = PROXY_DOMAINS.some(domain => url.includes(domain));
    
    if (isProxyDomain) {
      // 使用代理API来避免CORS问题
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
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