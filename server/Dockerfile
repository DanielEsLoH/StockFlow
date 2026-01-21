# =============================================================================
# StockFlow Backend - Multi-Stage Docker Build
# =============================================================================
# This Dockerfile creates an optimized production image for the NestJS backend.
# Uses multi-stage builds to minimize final image size.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
# Install all dependencies including devDependencies for building
FROM node:20-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
# Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code
COPY . .

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Dependencies
# -----------------------------------------------------------------------------
# Install only production dependencies
FROM node:20-alpine AS prod-deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Generate Prisma client (needed at runtime)
RUN npx prisma generate

# -----------------------------------------------------------------------------
# Stage 4: Runner (Production)
# -----------------------------------------------------------------------------
# Create the final minimal production image
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy production dependencies
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy Prisma files (needed for migrations and runtime)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy package.json for version info
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads/products && \
    chown -R nestjs:nodejs /app/uploads

# Expose the application port
EXPOSE 3000

# Switch to non-root user
USER nestjs

# Health check - uses PORT env var (Railway sets this dynamically)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health/live || exit 1

# Start the application
CMD ["node", "dist/main.js"]