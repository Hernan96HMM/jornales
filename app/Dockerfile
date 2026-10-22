# ===== recategorizacion-jornales — Dockerfile multi-stage (Next.js 14 standalone + better-sqlite3) =====

# --- deps: instala dependencias (incluye toolchain nativo para better-sqlite3) ---
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- builder: compila la app ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: imagen final sin toolchain de build ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# nc para el healthcheck (incluido en busybox de alpine)
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# salida standalone de Next (incluye node_modules traceados, better-sqlite3 nativo incluido)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# migraciones SQL (necesarias en runtime para el auto-migrate al arrancar)
COPY --from=builder /app/drizzle ./drizzle
# scripts de migración/seed manuales (npm run db:migrate:prod / db:seed)
COPY --from=builder /app/scripts ./scripts

# carpeta de datos (se monta ./data:/app/data; se crea por las dudas)
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
