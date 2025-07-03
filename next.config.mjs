/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Add this entire serverActions block
  serverActions: {
    bodySizeLimit: '10mb',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export const maxRequestBodySize = '10mb';

export default nextConfig;
