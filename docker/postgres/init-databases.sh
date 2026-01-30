#!/bin/bash
# =============================================================================
# PostgreSQL Initialization Script
# =============================================================================
# This script runs automatically when the PostgreSQL container starts for the
# first time. It creates both development and test databases.
# =============================================================================

set -e

echo "Creating additional databases..."

# Create test database (development database is created by POSTGRES_DB env var)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create test database if it doesn't exist
    SELECT 'CREATE DATABASE stockflow_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'stockflow_test')\gexec

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE stockflow_test TO $POSTGRES_USER;
EOSQL

echo "Databases created successfully:"
echo "  - stockflow_dev (development)"
echo "  - stockflow_test (testing)"
