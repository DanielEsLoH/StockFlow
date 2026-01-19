# =============================================================================
# StockFlow Client - Multi-Stage Docker Build
# =============================================================================
# This Dockerfile creates an optimized production image for the React Router v7
# frontend with server-side rendering (SSR) enabled.
#
# Build: docker build -t stockflow-client .
# Run:   docker run -p 3001:3001 stockflow-client
#
# Architecture:
#   Stage 1 (deps)      - Install all dependencies for building
#   Stage 2 (builder)   - Build the production SSR application
#   Stage 3 (runner)    - Minimal production runtime image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
# Install all dependencies including devDependencies needed for the build.
# Using a separate stage allows for better layer caching.
FROM node:20-alpine AS deps

# Set working directory
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
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
# Create the minimal production image with only runtime dependencies
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Set the port for the React Router server
# This can be overridden at runtime with -e PORT=xxxx
ENV PORT=3001

# Install essential runtime packages:
# - tini: A minimal init system to properly handle signals (SIGTERM, SIGINT)
#         This ensures graceful shutdown and prevents zombie processes
# - wget: Required for Docker health checks
RUN apk add --no-cache tini wget

# Create a non-root user and group for security
# Running as non-root prevents container escape vulnerabilities
# and follows the principle of least privilege
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 reactrouter

# Copy package files (needed for npm scripts and version info)
COPY --from=builder --chown=reactrouter:nodejs /app/package.json ./package.json

# Copy the built application from builder stage
# The build output contains:
# - client/: Static assets to be served (or by Nginx)
# - server/index.js: The SSR server entry point
COPY --from=builder --chown=reactrouter:nodejs /app/build ./build

# Install ONLY production dependencies needed at runtime
# React Router SSR requires @react-router/serve at runtime
# Using npm ci with --omit=dev ensures minimal footprint
COPY --from=builder /app/package-lock.json ./package-lock.json
RUN npm ci --omit=dev && \
    # Clean npm cache to reduce image size
    npm cache clean --force && \
    # Remove any leftover temporary files
    rm -rf /tmp/*

# Set ownership of node_modules to non-root user
RUN chown -R reactrouter:nodejs /app/node_modules

# Expose the application port
# Note: This is documentation only; actual port mapping happens at runtime
EXPOSE 3001

# Switch to non-root user for runtime
# All subsequent commands run as this user
USER reactrouter

# Health check configuration
# Verifies the SSR server is responding to requests
# - interval: Check every 30 seconds
# - timeout: Allow 10 seconds for response
# - start-period: Wait 10 seconds before first check (server startup time)
# - retries: Mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

# Use tini as the init system
# This ensures proper signal handling and process reaping
ENTRYPOINT ["/sbin/tini", "--"]

# Start the React Router SSR server
# react-router-serve is the production server provided by @react-router/serve
# It serves both the SSR responses and static client assets
CMD ["node", "node_modules/@react-router/serve/dist/cli.js", "./build/server/index.js"]