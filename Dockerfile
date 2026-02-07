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

# Install drizzle-kit and dependencies for migrations FIRST
# (before copying standalone output, so npm install doesn't overwrite it)
RUN apk add --no-cache python3 make g++
COPY --from=builder /app/package.json /tmp/package.json
COPY --from=builder /app/package-lock.json /tmp/package-lock.json
RUN cd /tmp && npm install drizzle-kit better-sqlite3 drizzle-orm && \
    mkdir -p /app/migrate_modules && \
    cp -r /tmp/node_modules /app/migrate_modules/node_modules && \
    rm -rf /tmp/package.json /tmp/package-lock.json /tmp/node_modules
RUN apk del python3 make g++

# Copy migration files and drizzle config
COPY --from=builder /app/src/db/migrations ./src/db/migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Copy standalone output LAST so it is not overwritten
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Create data directory for the volume mount
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

EXPOSE 8080

CMD ["sh", "./start.sh"]
