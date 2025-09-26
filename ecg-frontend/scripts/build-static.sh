#!/bin/bash

# Build script for static export (S3 deployment)
# This script temporarily moves the API folder during build since API routes
# are incompatible with Next.js static export

echo "🚀 Starting static build process..."

# Check if API folder exists and move it temporarily
if [ -d "src/app/api" ]; then
    echo "📦 Moving API folder temporarily..."
    mv src/app/api .api-backup
fi

# Run the build
echo "🔨 Building static export..."
npm run build

# Store the build exit code
BUILD_EXIT_CODE=$?

# Restore API folder regardless of build success/failure
if [ -d ".api-backup" ]; then
    echo "♻️ Restoring API folder..."
    mv .api-backup src/app/api
fi

# Exit with the build exit code
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Build completed successfully!"
else
    echo "❌ Build failed with exit code $BUILD_EXIT_CODE"
fi

exit $BUILD_EXIT_CODE