# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
ENV DATABASE_URL=/data/sqlite.db

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (includes server.js, node_modules with drizzle-orm and better-sqlite3)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy migration files and migration script
COPY --from=builder /app/src/db/migrations ./src/db/migrations
COPY migrate.cjs ./migrate.cjs

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Create data directory for the volume mount
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

EXPOSE 8080

CMD ["sh", "./start.sh"]
