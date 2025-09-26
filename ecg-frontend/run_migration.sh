#!/bin/bash

# ECG Assets Migration Script
# This script installs PostgreSQL client and runs the migration

set -e  # Exit on any error

echo "🚀 Starting ECG Assets Migration..."

# Check if we're on EC2/ECS instance
if [ ! -f /etc/system-release ]; then
    echo "❌ This script should be run on Amazon Linux EC2/ECS instance"
    exit 1
fi

# Install PostgreSQL client
echo "📦 Installing PostgreSQL client..."
if command -v dnf &> /dev/null; then
    # Amazon Linux 2023
    sudo dnf install -y postgresql15
elif command -v yum &> /dev/null; then
    # Amazon Linux 2
    sudo yum update -y
    sudo yum install -y postgresql
else
    echo "❌ Unsupported package manager"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client installation failed"
    exit 1
fi

echo "✅ PostgreSQL client installed successfully"

# Database connection details
DB_HOST="ecg-project-pipeline-dev-postgres.c6p4wa24mn5g.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="ecgdb"
DB_USER="postgres"
DB_PASSWORD="BE%BSIZ<BIQi4o1"

echo "🔗 Testing database connection..."

# Test connection
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Failed to connect to database. Check network and credentials."
    exit 1
fi

# Check if migration file exists
if [ ! -f "assets_migration.sql" ]; then
    echo "❌ Migration file 'assets_migration.sql' not found"
    echo "Please ensure the SQL file is in the current directory"
    exit 1
fi

echo "📄 Found migration file: assets_migration.sql"

# Run migration
echo "🔄 Running database migration..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f assets_migration.sql; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed"
    exit 1
fi

# Final verification
echo "🔍 Running final verification..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    '✅ Assets table created' as status,
    COUNT(*) as total_records
FROM assets;

SELECT
    '📊 Category distribution:' as info;

SELECT
    category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM assets
GROUP BY category
ORDER BY count DESC;
"

echo ""
echo "🎉 ECG Assets Migration Complete!"
echo "📈 Total records migrated: $(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM assets;")"
echo ""