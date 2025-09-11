#!/bin/bash

# Production deployment script for Railway

echo "🚂 Starting Railway deployment..."

# Check if we're in production
if [ "$NODE_ENV" = "production" ]; then
  echo "📦 Production environment detected"
  
  # Use production schema
  cp prisma/schema.production.prisma prisma/schema.prisma
  
  # Generate Prisma client
  npx prisma generate
  
  # Push database schema (creates tables)
  npx prisma db push --accept-data-loss
  
  echo "✅ Database setup complete"
else
  echo "🔧 Development environment - using SQLite"
  npx prisma generate
fi

# Build the app
npm run build

echo "🎉 Deployment preparation complete!"