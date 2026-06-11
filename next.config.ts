import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: process.env.BASE_PATH || '',
  output: process.env.MOBILE_BUILD ? 'export' : (process.env.VERCEL ? undefined : 'standalone'),
  images: process.env.MOBILE_BUILD ? {
    unoptimized: true,
  } : undefined,
  pageExtensions: process.env.MOBILE_BUILD ? ['tsx', 'ts', 'jsx', 'js'] : ['tsx', 'ts', 'jsx', 'js'],
  transpilePackages: ['mathml2omml', 'pptxgenjs'],
  serverExternalPackages: [],
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
};

export default nextConfig;
