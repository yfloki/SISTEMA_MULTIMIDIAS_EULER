import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@aurora/shared'],
  images: { unoptimized: true }, // imagens vêm do media server local
  async rewrites() {
    // No container (deploy), o Next faz proxy same-origin para api e media —
    // um único domínio/porta exposta. Em dev local, o front fala direto
    // com localhost:4000/4001 e estas rewrites não são usadas.
    if (!process.env.DOCKER_RUNTIME) return [];
    return [
      { source: '/api/:path*', destination: 'http://127.0.0.1:4000/api/:path*' },
      { source: '/media/:path*', destination: 'http://127.0.0.1:4001/:path*' },
    ];
  },
};
export default config;
