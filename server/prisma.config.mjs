// prisma.config.mjs
// Using ESM JavaScript for Docker production compatibility
// This avoids the need for ts-node in the runner stage
// Reference: https://www.prisma.io/docs/orm/reference/prisma-config-reference

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Use process.env directly for better Docker compatibility
    // The env() helper throws if variable is missing, which breaks build steps
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'node dist/prisma/seed.js',
  },
});
