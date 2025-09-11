#!/bin/bash

echo "🚂 Starting Railway deployment process..."

# First, build the app
echo "📦 Building application..."
npm run build

# Check if we need to use PostgreSQL schema
if [ -n "$DATABASE_URL" ]; then
  echo "🐘 Production environment detected - using PostgreSQL"
  
  # Switch to production schema
  if [ -f "prisma/schema.production.prisma" ]; then
    echo "📄 Switching to PostgreSQL schema"
    cp prisma/schema.production.prisma prisma/schema.prisma
  else
    echo "❌ Warning: prisma/schema.production.prisma not found!"
  fi
else
  echo "🗄️  Development environment - using SQLite"
fi

# Generate Prisma client for the correct schema
echo "🔧 Generating Prisma client..."
npx prisma generate

# Setup database (only in production)
if [ -n "$DATABASE_URL" ]; then
  echo "📊 Setting up PostgreSQL database..."
  npx prisma db push --accept-data-loss
fi

echo "🚀 Starting application..."
exec npm start