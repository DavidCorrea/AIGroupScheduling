#!/bin/sh
set -e
echo "Running migrations..."
npx drizzle-kit migrate
echo "Starting server..."
node server.js
