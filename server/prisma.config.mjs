// prisma.config.mjs
// Using ESM JavaScript for Docker production compatibility
// This avoids the need for ts-node in the runner stage
// Reference: https://www.prisma.io/docs/orm/reference/prisma-config-reference

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Use process.env directly for better Docker compatibility
    // dotenv/config loads .env file for local development
    // In Docker/production, environment variables are set by the container
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'node dist/prisma/seed.js',
  },
});
