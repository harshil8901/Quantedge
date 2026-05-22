import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  async rewrites() {
    const backend =
      process.env.API_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
      'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
