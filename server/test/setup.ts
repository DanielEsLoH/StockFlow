// =============================================================================
// Jest Test Setup
// =============================================================================
// This file runs before all tests to configure the test environment.
// It loads environment variables from .env.test to ensure tests use
// the Docker test database instead of the development database.
// =============================================================================

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Verify test database is configured
if (!process.env.DATABASE_URL?.includes('stockflow_test')) {
  console.warn(
    '⚠️  WARNING: DATABASE_URL does not point to stockflow_test database.',
    'Tests may affect development data!',
  );
}

// Set test-specific defaults
process.env.NODE_ENV = 'test';
process.env.ARCJET_ENABLED = 'false';
