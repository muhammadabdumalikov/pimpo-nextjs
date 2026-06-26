# syntax=docker/dockerfile:1.7

# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && \
    pnpm config set network-concurrency 4 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000
COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time, so the backend URL the browser
# calls must be provided here (override with --build-arg).
ARG NEXT_PUBLIC_API_URL=http://localhost:3050
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- Runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

# Standalone output bundles a minimal server.js + node_modules.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3100
CMD ["node", "server.js"]
