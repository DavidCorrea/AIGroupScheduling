#!/bin/sh
set -e
echo "Running migrations..."
node migrate.cjs
echo "Starting server..."
node server.js
