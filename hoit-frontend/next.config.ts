import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // S3 정적 호스팅을 위한 설정 (프로덕션에만 적용)
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export', // 정적 파일로 빌드
    trailingSlash: true, // S3용 URL 형식
  }),

  // ES Module 패키지 transpile 설정
  transpilePackages: ['motiontext-renderer'],

  // 이미지 최적화 비활성화 (정적 export용)
  images: {
    unoptimized: true, // S3에서는 이미지 최적화 불가
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      // CloudFront 도메인들
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'd31nzc58rhgh3i.cloudfront.net',
      },
      // 커스텀 도메인
      {
        protocol: 'https',
        hostname: 'ho-it.site',
      },
      // S3 도메인
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },

  // 환경변수 설정
  env: {
    // 개발 환경에서는 YouTube 업로드를 위해 STATIC_EXPORT를 false로 설정
    STATIC_EXPORT: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },

  // CORS 해결을 위한 API 프록시 (개발 환경에만 활성화)
  ...(process.env.NODE_ENV === 'development' && {
    async rewrites() {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL

      return [
        // 백엔드 API 프록시 (모든 /api 요청을 NEXT_PUBLIC_API_URL로)
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ]
    },
  }),

  // ESLint 설정
  eslint: {
    ignoreDuringBuilds: true,
  },

  // // 보안 헤더 설정
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'X-Frame-Options',
  //           value: 'DENY',
  //         },
  //         {
  //           key: 'X-Content-Type-Options',
  //           value: 'nosniff',
  //         },
  //         {
  //           key: 'Referrer-Policy',
  //           value: 'origin-when-cross-origin',
  //         },
  //       ],
  //     },
  //   ]
  // },

  // 웹팩 설정 최적화
  webpack: (config, { isServer, dev }) => {
    // 프로덕션 빌드 최적화
    if (!dev && isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        bufferutil: 'commonjs bufferutil',
      })
    }

    return config
  },
}

export default nextConfig
