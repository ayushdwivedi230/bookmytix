# ==============================================================================
# BookMyTix Production Multi-Stage Containerfile
# Stage 1: Build frontend bundle & production server
# Stage 2: Minimal hardened Node.js 20 Alpine runtime
# ==============================================================================

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy full source and build artifacts
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ─── Stage 2: Hardened Runtime ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Create unprivileged system user for zero root vulnerability
RUN addgroup -g 1001 -S bookmytix && \
    adduser -S bookmytix -u 1001 -G bookmytix

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled bundles and static assets from builder
COPY --from=builder --chown=bookmytix:bookmytix /app/dist ./dist
COPY --from=builder --chown=bookmytix:bookmytix /app/public ./public
COPY --from=builder --chown=bookmytix:bookmytix /app/server/db/migrations ./server/db/migrations

USER bookmytix

EXPOSE 3000

# Container liveness health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
