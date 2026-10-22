/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // better-sqlite3 es nativo: no debe empaquetarse, se usa desde node_modules
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
