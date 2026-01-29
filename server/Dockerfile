# =============================================================================
# StockFlow Backend - Multi-Stage Docker Build
# =============================================================================
# This Dockerfile creates an optimized production image for the NestJS backend.
# Uses multi-stage builds to minimize final image size and improve security.
#
# Build: docker build -t stockflow-server .
# Run:   docker run -p 3000:3000 -e PORT=3000 stockflow-server
#
# Optimizations:
# - Multi-stage build reduces final image size by ~70%
# - Non-root user for security
# - tini init system for proper signal handling
# - Layer ordering optimized for cache efficiency
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
# Install all dependencies including devDependencies for building.
# This stage is cached and reused when package files don't change.
FROM node:20-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules (bcrypt, etc.)
# libc6-compat is needed for Alpine compatibility with some npm packages
RUN apk add --no-cache libc6-compat python3 make g++

# Upgrade npm to specific version for consistency across builds
RUN npm install -g npm@11.8.0

# Copy package files first for optimal layer caching
# Changes to source code won't invalidate the npm install cache
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
# Using npm ci for reproducible builds from package-lock.json
RUN npm ci && \
    # Generate Prisma client (needed for build and runtime)
    npx prisma generate

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
# Build the TypeScript application to JavaScript
FROM node:20-alpine AS builder

WORKDIR /app

# Upgrade npm to specific version for consistency across builds
RUN npm install -g npm@11.8.0

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy Prisma generated client
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

# Copy source code
COPY . .

# Build the NestJS application
# This compiles TypeScript to JavaScript in the dist/ directory
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Dependencies
# -----------------------------------------------------------------------------
# Install only production dependencies to minimize final image size
FROM node:20-alpine AS prod-deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Upgrade npm to specific version for consistency across builds
RUN npm install -g npm@11.8.0

# Copy package files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
# --omit=dev excludes devDependencies
RUN npm ci --omit=dev && \
    # Generate Prisma client (needed at runtime for database operations)
    npx prisma generate && \
    # Clean npm cache to reduce image size
    npm cache clean --force && \
    # Remove unnecessary files from node_modules
    rm -rf /app/node_modules/.cache

# -----------------------------------------------------------------------------
# Stage 4: Runner (Production)
# -----------------------------------------------------------------------------
# Create the final minimal production image
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
# Build version for cache invalidation
ARG BUILD_VERSION=3

# Install runtime dependencies:
# - tini: Minimal init system for proper signal handling (SIGTERM, SIGINT)
#         Prevents zombie processes and ensures graceful shutdown
RUN apk add --no-cache tini && \
    # Upgrade npm to silence "new version available" notices during startup
    npm install -g npm@11.8.0

# Create non-root user for security (principle of least privilege)
# Running as root in containers is a security risk
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy production dependencies with correct ownership
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application (includes compiled seed at dist/prisma/seed.js)
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy Prisma files (needed for migrations and runtime queries)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Copy package.json for version info and npm scripts
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Copy startup script
COPY --from=builder --chown=nestjs:nodejs /app/scripts/startup.sh ./scripts/startup.sh
RUN chmod +x ./scripts/startup.sh

# Create uploads directory with proper permissions
# This directory is used for user-uploaded files
RUN mkdir -p /app/uploads/products && \
    chown -R nestjs:nodejs /app/uploads

# Document the port (Railway will override with dynamic PORT)
# Using a variable-friendly approach
EXPOSE 3000

# Switch to non-root user for security
USER nestjs

# Note: Health check is handled by Railway's built-in health monitoring
# Do NOT add HEALTHCHECK instruction as Railway dynamically assigns PORT
# For docker-compose, health checks are defined in the compose file

# Use tini as init system for proper signal handling
# This ensures Node.js receives SIGTERM for graceful shutdown
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application using startup script
# The script runs: migrations -> seed (if needed) -> server
# Seed is compiled to JavaScript and runs without ts-node
CMD ["./scripts/startup.sh"]