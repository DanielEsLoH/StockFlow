# Deployment Guide

This guide covers deploying the StockFlow backend to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [Railway Deployment](#railway-deployment)
- [Render Deployment](#render-deployment)
- [Manual VPS Deployment](#manual-vps-deployment)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- Node.js 20+ (LTS recommended)
- PostgreSQL 16+ database
- Environment variables configured
- (Optional) Docker installed
- (Optional) Stripe account for payments
- (Optional) Brevo account for emails

---

## Environment Configuration

### Required Variables

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (use connection pooling in production)
DATABASE_URL=postgresql://user:password@host:5432/stockflow?schema=public

# JWT Secrets (generate secure random strings)
JWT_SECRET=<generate-with-openssl-rand-base64-64>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-64>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Frontend URL (for CORS)
FRONTEND_URL=https://app.yourdomain.com
```

### Optional Variables

```bash
# Email (Brevo)
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=StockFlow

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Security
ARCJET_KEY=ajkey_...
ARCJET_ENABLED=true
```

### Generating Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## Database Setup

### 1. Create Production Database

```sql
-- Connect to PostgreSQL as admin
CREATE DATABASE stockflow_prod;
CREATE USER stockflow WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE stockflow_prod TO stockflow;
```

### 2. Run Migrations

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://stockflow:password@host:5432/stockflow_prod"

# Deploy migrations (doesn't generate new ones)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. Seed Initial Data (Optional)

```bash
npm run prisma:seed
```

### Connection Pooling

For production, use a connection pooler like PgBouncer or Prisma Accelerate:

```bash
# With Prisma Accelerate
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."

# With PgBouncer
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/stockflow?pgbouncer=true"
```

---

## Docker Deployment

### Dockerfile

Create `Dockerfile` in the server directory:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Create uploads directory
RUN mkdir -p uploads && chown nestjs:nodejs uploads

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER nestjs

CMD ["node", "dist/main"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: stockflow
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: stockflow_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stockflow"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://stockflow:${DB_PASSWORD}@postgres:5432/stockflow_prod
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      NODE_ENV: production
      FRONTEND_URL: ${FRONTEND_URL}
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads

volumes:
  postgres_data:
  uploads:
```

### Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# View logs
docker-compose logs -f backend
```

---

## Railway Deployment

### 1. Connect Repository

1. Go to [Railway](https://railway.app)
2. Create new project from GitHub repository
3. Select the `server` directory as root

### 2. Add PostgreSQL

1. Click "New" → "Database" → "PostgreSQL"
2. Railway automatically sets `DATABASE_URL`

### 3. Configure Environment

Add these environment variables in Railway dashboard:

```
NODE_ENV=production
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
FRONTEND_URL=https://your-frontend.com
```

### 4. Configure Build

Set these in Railway settings:

```
Build Command: npm install && npx prisma generate && npx prisma migrate deploy && npm run build
Start Command: npm run start:prod
```

### 5. Deploy

Railway auto-deploys on push to main branch.

---

## Render Deployment

### 1. Create Web Service

1. Go to [Render](https://render.com)
2. New → Web Service
3. Connect GitHub repository
4. Set root directory to `server`

### 2. Configure Service

```
Environment: Node
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm run start:prod
```

### 3. Add PostgreSQL

1. New → PostgreSQL
2. Copy the Internal Database URL

### 4. Environment Variables

Add in Render dashboard:

```
DATABASE_URL=<internal-postgres-url>
NODE_ENV=production
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
FRONTEND_URL=https://your-frontend.com
```

### 5. Deploy Hook for Migrations

Create a deploy hook script or use the pre-deploy command:

```bash
npx prisma migrate deploy
```

---

## Manual VPS Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

### 2. Clone and Build

```bash
# Clone repository
git clone https://github.com/your-org/stockflow.git
cd stockflow/server

# Install dependencies
npm ci --production=false

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Run migrations
npx prisma migrate deploy
```

### 3. Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'stockflow-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 4. Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### 5. Configure Nginx

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## SSL/TLS Configuration

### Using Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs stockflow-api

# Monitor resources
pm2 monit

# View status
pm2 status
```

### Application Logging

The application logs to stdout. In production, consider:

1. **PM2 Log Rotation:**
   ```bash
   pm2 install pm2-logrotate
   ```

2. **External Services:**
   - Datadog
   - New Relic
   - Sentry (for errors)

### Health Checks

The API provides a health endpoint:

```bash
curl https://api.yourdomain.com/
# Returns: Hello World!
```

For deeper health checks, implement a `/health` endpoint that checks database connectivity.

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Prisma connection
npx prisma db pull
```

### Migration Failures

```bash
# Reset database (CAUTION: deletes all data)
npx prisma migrate reset

# Or manually fix and re-run
npx prisma migrate deploy
```

### Memory Issues

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run start:prod
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Permission Denied (Uploads)

```bash
# Fix uploads directory permissions
chmod 755 uploads
chown -R www-data:www-data uploads
```

---

## Security Checklist

- [ ] Use strong, unique JWT secrets
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set proper CORS origins
- [ ] Enable rate limiting (Arcjet)
- [ ] Use connection pooling for database
- [ ] Keep dependencies updated
- [ ] Monitor for security advisories
- [ ] Implement proper backup strategy
- [ ] Use environment variables for secrets (never commit .env)
- [ ] Enable database SSL connection in production

---

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20250113.sql
```

### Automated Backups

Set up cron job for daily backups:

```bash
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/stockflow_$(date +\%Y\%m\%d).sql.gz
```

---

## Scaling Considerations

1. **Horizontal Scaling:** Use PM2 cluster mode or multiple containers
2. **Database Scaling:** Use read replicas for read-heavy workloads
3. **Caching:** Implement Redis for session/query caching
4. **CDN:** Use a CDN for static file uploads
5. **Queue:** Use Bull/BullMQ for background job processing