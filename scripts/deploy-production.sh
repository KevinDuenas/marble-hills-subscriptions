#!/bin/bash

# Production deployment script for Railway

echo "🚂 Starting Railway deployment..."

# Check if DATABASE_URL is set (Railway provides this)
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Production environment detected - DATABASE_URL found"
  
  # Use production schema (PostgreSQL)
  cp prisma/schema.production.prisma prisma/schema.prisma
  
  echo "📄 Switched to PostgreSQL schema"
  
  # Generate Prisma client
  npx prisma generate
  
  # Push database schema (creates tables)
  npx prisma db push --accept-data-loss
  
  echo "✅ Database setup complete"
else
  echo "🔧 Development environment - using SQLite"
  # Keep the default SQLite schema
  npx prisma generate
fi

echo "🎉 Schema setup complete!"