#!/bin/sh
set -e
echo "Running migrations..."
NODE_PATH=/app/migrate_modules/node_modules npx --prefix /app/migrate_modules drizzle-kit migrate --config /app/drizzle.config.ts
echo "Starting server..."
node server.js
