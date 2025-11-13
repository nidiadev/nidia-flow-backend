#!/bin/bash

echo "🐘 Setting up PostgreSQL database for NIDIA Flow SuperAdmin..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop existing container if running
echo "🛑 Stopping existing PostgreSQL container..."
docker stop nidia-superadmin-db 2>/dev/null || true
docker rm nidia-superadmin-db 2>/dev/null || true

# Start PostgreSQL container
echo "🚀 Starting PostgreSQL container..."
docker run -d \
  --name nidia-superadmin-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=nidia_superadmin \
  -p 5432:5432 \
  -v nidia_superadmin_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Test connection
echo "🔍 Testing database connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker exec nidia-superadmin-db pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ PostgreSQL failed to start after $max_attempts attempts"
        exit 1
    fi
    
    echo "⏳ Attempt $attempt/$max_attempts - waiting for PostgreSQL..."
    sleep 2
    ((attempt++))
done

echo "🎉 PostgreSQL database setup completed!"
echo ""
echo "Database connection details:"
echo "Host: localhost"
echo "Port: 5432"
echo "Database: nidia_superadmin"
echo "Username: postgres"
echo "Password: password"
echo ""
echo "To connect: psql -h localhost -p 5432 -U postgres -d nidia_superadmin"