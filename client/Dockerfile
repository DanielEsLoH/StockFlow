# =============================================================================
# StockFlow Client - Multi-Stage Docker Build
# =============================================================================
# This Dockerfile creates an optimized production image for the React Router v7
# frontend with server-side rendering (SSR) enabled.
#
# Build: docker build -t stockflow-client .
# Run:   docker run -p 3001:3001 -e PORT=3001 stockflow-client
#
# Architecture:
#   Stage 1 (deps)      - Install all dependencies for building
#   Stage 2 (builder)   - Build the production SSR application
#   Stage 3 (prod-deps) - Install production-only dependencies
#   Stage 4 (runner)    - Minimal production runtime image
#
# Optimizations:
# - Multi-stage build reduces final image size by ~80%
# - Separate prod-deps stage for better layer caching
# - Non-root user for security
# - tini init system for proper signal handling
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
# Install all dependencies including devDependencies needed for the build.
# Using a separate stage allows for better layer caching.
FROM node:20-alpine AS deps

WORKDIR /app

# Install libc6-compat for Alpine compatibility with some npm packages
# This is required for certain native bindings that expect glibc
RUN apk add --no-cache libc6-compat

# Copy package files first (for layer caching)
# When these files don't change, Docker can reuse the cached layer
COPY package.json package-lock.json ./

# Install all dependencies using npm ci for reproducible builds
# npm ci is preferred over npm install because:
# - It uses exact versions from package-lock.json
# - It's faster and more reliable for CI/CD
# - It removes node_modules first to ensure clean state
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
# Build the production SSR application using Vite and React Router
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
# These are embedded into the client bundle at build time
ARG VITE_API_URL=/api

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files (needed for build scripts)
COPY package.json package-lock.json ./

# Copy application source code
# Note: .dockerignore excludes unnecessary files
COPY . .

# Set environment variables for the build
# NODE_ENV=production enables optimized build output
# VITE_* variables are embedded into the client bundle by Vite
ENV NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}

# Build the React Router SSR application
# This creates:
#   - ./build/client/  - Static assets (JS, CSS, images)
#   - ./build/server/  - SSR server bundle (index.js)
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Dependencies
# -----------------------------------------------------------------------------
# Install only production dependencies for the runtime image
# This separate stage improves layer caching
FROM node:20-alpine AS prod-deps

WORKDIR /app

# Install libc6-compat for native module compatibility
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./

# Install ONLY production dependencies
# React Router SSR requires @react-router/serve and related packages
RUN npm ci --omit=dev && \
    # Clean npm cache to reduce image size
    npm cache clean --force && \
    # Remove unnecessary files
    rm -rf /tmp/*

# -----------------------------------------------------------------------------
# Stage 4: Production Runner
# -----------------------------------------------------------------------------
# Create the minimal production image with only runtime dependencies
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Default port (can be overridden by Railway or docker run -e PORT=xxxx)
ENV PORT=3001

# Install essential runtime packages:
# - tini: A minimal init system to properly handle signals (SIGTERM, SIGINT)
#         This ensures graceful shutdown and prevents zombie processes
RUN apk add --no-cache tini

# Create a non-root user and group for security
# Running as non-root prevents container escape vulnerabilities
# and follows the principle of least privilege
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 reactrouter

# Copy package.json (needed for npm scripts and version info)
COPY --from=builder --chown=reactrouter:nodejs /app/package.json ./package.json

# Copy the built application from builder stage
# The build output contains:
# - client/: Static assets to be served
# - server/index.js: The SSR server entry point
COPY --from=builder --chown=reactrouter:nodejs /app/build ./build

# Copy production dependencies from prod-deps stage
COPY --from=prod-deps --chown=reactrouter:nodejs /app/node_modules ./node_modules

# Document the default port
# Note: This is documentation only; actual port is set via PORT env var
EXPOSE 3001

# Switch to non-root user for runtime
# All subsequent commands run as this user
USER reactrouter

# Note: Health check is handled by Railway's built-in health monitoring
# Do NOT add HEALTHCHECK instruction as Railway dynamically assigns PORT
# For docker-compose, health checks are defined in the compose file

# Use tini as the init system
# This ensures proper signal handling and process reaping
ENTRYPOINT ["/sbin/tini", "--"]

# Start the React Router SSR server
# react-router-serve is the production server provided by @react-router/serve
# It serves both the SSR responses and static client assets
CMD ["node", "node_modules/@react-router/serve/dist/cli.js", "./build/server/index.js"]