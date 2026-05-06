#!/bin/bash

# CreviaTube Deployment Helper Script
# Make this file executable: chmod +x deploy.sh

echo "🚀 CreviaTube Deployment Helper"
echo "=============================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please configure your environment variables."
    echo "   Required: DATABASE_URL, SESSION_SECRET"
    exit 1
fi

# Validate required environment variables
echo "🔍 Checking environment variables..."

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in environment"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET not set in environment"
    exit 1
fi

echo "✅ Environment variables configured"

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Push database schema
echo "📊 Setting up database schema..."
npm run db:push

if [ $? -ne 0 ]; then
    echo "❌ Database setup failed"
    exit 1
fi

echo "✅ Database schema updated"

# Run type checking
echo "🔍 Running type checks..."
npm run check

if [ $? -ne 0 ]; then
    echo "⚠️  Type check issues found, but continuing..."
fi

# Platform-specific deployment
case "$1" in
    "railway")
        echo "🚄 Deploying to Railway..."
        railway up
        ;;
    "vercel")
        echo "▲ Deploying to Vercel..."
        vercel --prod
        ;;
    "docker")
        echo "🐳 Building Docker image..."
        docker build -t CreviaTube .
        echo "✅ Docker image built. Run with:"
        echo "   docker run -p 5000:5000 --env-file .env CreviaTube"
        ;;
    "local")
        echo "🏠 Starting local production server..."
        npm start
        ;;
    *)
        echo "📋 Deployment ready! Choose your platform:"
        echo ""
        echo "Railway:  ./deploy.sh railway"
        echo "Vercel:   ./deploy.sh vercel" 
        echo "Docker:   ./deploy.sh docker"
        echo "Local:    ./deploy.sh local"
        echo ""
        echo "Or manually deploy using the configuration files:"
        echo "- Dockerfile (Docker/Railway/Render)"
        echo "- vercel.json (Vercel)"
        echo "- render.yaml (Render)"
        ;;
esac

echo ""
echo "✅ Deployment preparation complete!"
echo "📚 See DEPLOYMENT.md for detailed instructions"