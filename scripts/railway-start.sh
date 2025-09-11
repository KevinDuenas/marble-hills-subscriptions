#!/bin/bash

echo "🚂 Starting Railway app..."

# Check if we need to use PostgreSQL schema
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Production environment - using PostgreSQL"
  
  # Only copy if the production schema exists and is different
  if [ -f "prisma/schema.production.prisma" ]; then
    echo "📄 Switching to PostgreSQL schema"
    cp prisma/schema.production.prisma prisma/schema.prisma
  fi
  
  # Generate Prisma client for the correct schema
  echo "🔧 Generating Prisma client..."
  npx prisma generate
  
  # Setup database
  echo "📊 Setting up database..."
  npx prisma db push --accept-data-loss
else
  echo "🔧 Development environment - using SQLite"
  npx prisma generate
fi

echo "🚀 Starting application..."
exec npm start