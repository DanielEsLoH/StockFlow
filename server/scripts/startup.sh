#!/bin/sh
set -e

echo "🚀 Starting StockFlow API..."

# Run migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Run seed (script checks internally if seeding is needed)
echo "🌱 Running database seed..."
npx prisma db seed

# Start the application
echo "🎯 Starting Node.js server..."
exec node dist/main.js