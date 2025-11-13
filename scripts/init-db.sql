-- Initialize NIDIA Flow SuperAdmin Database
-- This script runs when the PostgreSQL container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create additional databases for development/testing if needed
-- These will be created by Prisma migrations

-- Set timezone
SET timezone = 'America/Bogota';

-- Log initialization
SELECT 'NIDIA Flow SuperAdmin Database initialized successfully' as message;