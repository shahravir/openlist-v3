#!/bin/bash

# Script to set up database on remote PostgreSQL server
# Usage: ./setup-remote.sh

echo "Setting up OpenList database on remote server..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it using one of these formats:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database?sslmode=require'"
    echo ""
    echo "Example:"
    echo "  export DATABASE_URL='postgresql://myuser:mypass@db.example.com:5432/openlist'"
    exit 1
fi

echo "Using DATABASE_URL: ${DATABASE_URL//:*@/:***@}" # Hide password in output

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME" ]; then
    echo "Error: Could not extract database name from DATABASE_URL"
    exit 1
fi

echo "Database name: $DB_NAME"
echo ""

# Check if we can connect
echo "Testing connection..."
psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Could not connect to database"
    echo "Please check your DATABASE_URL and ensure:"
    echo "  1. The database server is accessible"
    echo "  2. Your credentials are correct"
    echo "  3. The database exists (or you have permission to create it)"
    exit 1
fi

echo "Connection successful!"
echo ""

# Create database if it doesn't exist (this might fail if DB already exists, which is OK)
echo "Creating database if it doesn't exist..."
psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1 || psql "postgresql://$(echo $DATABASE_URL | sed 's|.*://\([^:]*\):\([^@]*\)@\([^/]*\)/.*|\1:\2@\3/postgres|')" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null

# Run schema
echo "Running schema..."
psql "$DATABASE_URL" < "$(dirname "$0")/schema.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database setup complete!"
    echo ""
    echo "Verifying tables..."
    psql "$DATABASE_URL" -c "\dt"
else
    echo ""
    echo "✗ Error running schema"
    exit 1
fi

