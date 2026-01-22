#!/bin/sh
set -e

echo "🚀 Starting StockFlow API..."

# Run migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Check if database needs seeding (check if SystemAdmin table is empty)
echo "🔍 Checking if database needs seeding..."
ADMIN_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
prisma.systemAdmin.count()
  .then(count => { console.log(count); process.exit(0); })
  .catch(() => { console.log(0); process.exit(0); });
")

if [ "$ADMIN_COUNT" = "0" ]; then
  echo "🌱 Database is empty, running seed..."
  npx prisma db seed
  echo "✅ Seeding completed!"
else
  echo "✅ Database already has data, skipping seed."
fi

# Start the application
echo "🎯 Starting Node.js server..."
exec node dist/main.js