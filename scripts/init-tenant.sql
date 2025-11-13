-- NIDIA Flow Tenant Database Initialization
-- This script only sets up extensions and functions
-- Data will be inserted after Prisma schema is applied

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to generate random UUIDs (for compatibility)
CREATE OR REPLACE FUNCTION gen_random_uuid() RETURNS uuid AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Log the initialization
DO $$
BEGIN
    RAISE NOTICE 'Tenant database extensions initialized successfully';
    RAISE NOTICE 'Tables will be created by Prisma migrations';
END $$;