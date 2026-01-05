#!/bin/bash

# Script to initialize database on Render PostgreSQL
# Usage: ./init-render.sh
# 
# This script should be run once after creating the PostgreSQL database on Render.
# You can run it via Render's Shell or locally if you have psql installed and DATABASE_URL set.

set -e  # Exit on error

echo "Initializing OpenList database on Render..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo ""
    echo "On Render, DATABASE_URL is automatically provided when you link the database to your service."
    echo "If running locally, set it using:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database?sslmode=require'"
    echo ""
    echo "You can find the DATABASE_URL in your Render dashboard under the database service."
    exit 1
fi

echo "Using DATABASE_URL: ${DATABASE_URL//:*@/:***@}" # Hide password in output
echo ""

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
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✓ Connection successful!"
else
    echo "Error: Could not connect to database"
    echo "Please check your DATABASE_URL and ensure:"
    echo "  1. The database server is accessible"
    echo "  2. Your credentials are correct"
    echo "  3. SSL is enabled (Render requires SSL connections)"
    exit 1
fi

echo ""

# Check if tables already exist
echo "Checking if database is already initialized..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'todos');" | tr -d ' ')

if [ "$TABLE_COUNT" -eq "2" ]; then
    echo "⚠ Database appears to be already initialized (users and todos tables exist)"
    read -p "Do you want to re-run the schema? This will fail if tables exist. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping schema initialization."
        exit 0
    fi
fi

# Run schema
echo "Running schema..."
SCHEMA_FILE="$(dirname "$0")/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Error: Schema file not found at $SCHEMA_FILE"
    exit 1
fi

# Use psql with SSL mode require (Render requires SSL)
psql "$DATABASE_URL?sslmode=require" < "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database initialization complete!"
    echo ""
    echo "Verifying tables..."
    psql "$DATABASE_URL?sslmode=require" -c "\dt"
    echo ""
    echo "✓ Setup successful! Your database is ready to use."
else
    echo ""
    echo "✗ Error running schema"
    exit 1
fi

