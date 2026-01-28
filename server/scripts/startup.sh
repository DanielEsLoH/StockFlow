#!/bin/sh
set -e

echo "Starting StockFlow API..."

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run seed using compiled JavaScript (works in production without ts-node)
# The seed script checks internally if seeding is needed (skips if data exists)
echo "Running database seed..."
node dist/prisma/seed.js

# Start the application
echo "Starting Node.js server..."
exec node dist/main.js