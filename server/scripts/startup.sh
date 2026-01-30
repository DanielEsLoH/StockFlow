#!/bin/sh
set -e

echo "Starting StockFlow API..."

# Run migrations
# Using ./node_modules/.bin/prisma instead of npx to avoid npm resolution issues
# that cause "Class extends value undefined" errors in Alpine containers
echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy

# Run seed using compiled JavaScript (works in production without ts-node)
# The seed script checks internally if seeding is needed (skips if data exists)
echo "Running database seed..."
node dist/prisma/seed.js

# Start the application
echo "Starting Node.js server..."
exec node dist/main.js