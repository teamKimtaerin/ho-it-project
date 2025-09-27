# =====================================
# Frontend Dockerfile (Next.js) - Yarn Classic
# =====================================

# ----- Base Stage -----
FROM node:20-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 보안 및 성능을 위한 환경변수
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Alpine에서 필요한 기본 패키지
RUN apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

# 보안을 위한 사용자 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 개발/운영 모드 결정
ARG MODE=dev

# ----- Dependencies Stage -----
FROM base AS deps

# package.json과 yarn.lock 파일만 먼저 복사
COPY package.json yarn.lock ./

# 의존성 설치
RUN yarn install

# ----- Dev Stage -----
FROM base AS dev

# 개발모드 환경변수
ENV NODE_ENV=development

# node_modules 복사
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 소스 코드 복사
COPY --chown=nextjs:nodejs . .

# Next.js 캐시 디렉토리 생성
RUN mkdir -p .next && chown nextjs:nodejs .next

EXPOSE 3000

USER nextjs

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

CMD ["yarn", "dev", "--", "--hostname", "0.0.0.0"]

# ----- Build Stage -----
FROM base AS builder

# node_modules 복사
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 소스 코드 복사
COPY --chown=nextjs:nodejs . .

# 빌드 환경변수
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Next.js 캐시 디렉토리 생성
RUN mkdir -p .next && chown nextjs:nodejs .next

USER nextjs

# 빌드 실행
RUN yarn build

# ----- Production Stage -----
FROM base AS prod

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 프로덕션 의존성만 설치
COPY package.json yarn.lock ./
RUN yarn install --production=true && \
    yarn cache clean

# 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

EXPOSE 3000

USER nextjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]

# ----- Standalone Production -----
FROM base AS standalone

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Standalone 빌드만 복사 (최소 크기)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

EXPOSE 3000

USER nextjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]