# =============================================================================
# StockFlow - Combined Production Dockerfile
# =============================================================================
# This Dockerfile builds both backend and frontend in a single container.
# Uses supervisord to manage both processes.
#
# Note: For better scalability, deploy backend and frontend as separate services.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Backend Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend-deps

WORKDIR /app/server

RUN apk add --no-cache libc6-compat

COPY server/package*.json ./
COPY server/prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# -----------------------------------------------------------------------------
# Stage 2: Backend Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

COPY --from=backend-deps /app/server/node_modules ./node_modules
COPY --from=backend-deps /app/server/package*.json ./
COPY server/ .

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Backend Production Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend-prod-deps

WORKDIR /app/server

RUN apk add --no-cache libc6-compat

COPY server/package*.json ./
COPY server/prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

# -----------------------------------------------------------------------------
# Stage 4: Frontend Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-deps

WORKDIR /app/client

RUN apk add --no-cache libc6-compat

COPY client/package*.json ./

RUN npm ci

# -----------------------------------------------------------------------------
# Stage 5: Frontend Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

ARG VITE_API_URL=/api

COPY --from=frontend-deps /app/client/node_modules ./node_modules
COPY --from=frontend-deps /app/client/package*.json ./
COPY client/ .

ENV NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 6: Frontend Production Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-prod-deps

WORKDIR /app/client

RUN apk add --no-cache libc6-compat

COPY client/package*.json ./

RUN npm ci --omit=dev

# -----------------------------------------------------------------------------
# Stage 7: Production Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install supervisord, nginx, and utilities
RUN apk add --no-cache \
    supervisor \
    nginx \
    wget \
    tini

# Create non-root user
RUN addgroup --system --gid 1001 stockflow && \
    adduser --system --uid 1001 stockflow

# -----------------------------------------------------------------------------
# Copy Backend
# -----------------------------------------------------------------------------
COPY --from=backend-prod-deps --chown=stockflow:stockflow /app/server/node_modules ./server/node_modules
COPY --from=backend-builder --chown=stockflow:stockflow /app/server/dist ./server/dist
COPY --from=backend-builder --chown=stockflow:stockflow /app/server/prisma ./server/prisma
COPY --from=backend-builder --chown=stockflow:stockflow /app/server/package.json ./server/package.json

# -----------------------------------------------------------------------------
# Copy Frontend
# -----------------------------------------------------------------------------
COPY --from=frontend-prod-deps --chown=stockflow:stockflow /app/client/node_modules ./client/node_modules
COPY --from=frontend-builder --chown=stockflow:stockflow /app/client/build ./client/build
COPY --from=frontend-builder --chown=stockflow:stockflow /app/client/package.json ./client/package.json

# -----------------------------------------------------------------------------
# Nginx Configuration
# -----------------------------------------------------------------------------
RUN mkdir -p /run/nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Update nginx config for single-container setup
RUN sed -i 's/client:3001/127.0.0.1:3001/g' /etc/nginx/nginx.conf && \
    sed -i 's/backend:3000/127.0.0.1:3000/g' /etc/nginx/nginx.conf

# -----------------------------------------------------------------------------
# Supervisord Configuration
# -----------------------------------------------------------------------------
RUN mkdir -p /etc/supervisor.d

COPY <<'EOF' /etc/supervisor.d/stockflow.ini
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisord.log
pidfile=/var/run/supervisord.pid

[program:backend]
command=node /app/server/dist/main.js
directory=/app/server
user=stockflow
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV="production",PORT="3000"

[program:frontend]
command=node /app/client/node_modules/@react-router/serve/dist/cli.js /app/client/build/server/index.js
directory=/app/client
user=stockflow
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV="production",PORT="3001"

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

# -----------------------------------------------------------------------------
# Create directories and set permissions
# -----------------------------------------------------------------------------
RUN mkdir -p /app/server/uploads/products && \
    chown -R stockflow:stockflow /app && \
    chown -R stockflow:stockflow /var/log && \
    chown -R stockflow:stockflow /run/nginx && \
    chmod 755 /run/nginx

# Expose port 80 (nginx handles routing)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health/live || exit 1

# Use tini as init
ENTRYPOINT ["/sbin/tini", "--"]

# Start supervisord
CMD ["supervisord", "-c", "/etc/supervisord.conf"]