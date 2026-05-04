/** @type {import('next').NextConfig} */
const apiProxyBase =
  process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000';
const calendarEngineBase =
  process.env.CALENDAR_ENGINE_URL || 'http://127.0.0.1:8100';

const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/v1/bazi/liuyue',
          destination: `${calendarEngineBase}/api/v1/bazi/liuyue`,
        },
        {
          source: '/api/v1/bazi/liuri',
          destination: `${calendarEngineBase}/api/v1/bazi/liuri`,
        },
        {
          source: '/api/v1/health/:path*',
          destination: `${calendarEngineBase}/api/v1/health/:path*`,
        },
        {
          source: '/api/:path*',
          destination: `${apiProxyBase}/api/:path*`,
        },
        {
          source: '/socket.io/:path*',
          destination: `${apiProxyBase}/socket.io/:path*`,
        },
        {
          source: '/uploads/:path*',
          destination: `${apiProxyBase}/uploads/:path*`,
        },
      ],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;
