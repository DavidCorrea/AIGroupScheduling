#!/bin/sh
set -e
echo "Running migrations..."
drizzle-kit migrate --config /app/drizzle.config.ts
echo "Starting server..."
node server.js
