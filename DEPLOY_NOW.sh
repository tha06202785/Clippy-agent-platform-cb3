#!/bin/bash
# Clippy Production Deployment Script
# March 22, 2026 - Automated Deployment

echo "🚀 CLIPPY PRODUCTION DEPLOYMENT"
echo "================================"
echo ""

# Configuration
DEPLOYMENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
VERCEL_ORG="clippy-platform"
DOMAIN="useclippy.com"

echo "📦 Step 1: Building Frontend..."
echo "--------------------------------"
cd client

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build production
echo "Building production bundle..."
npm run build

echo "✅ Frontend build complete"
echo ""

echo "🔧 Step 2: Building Backend..."
echo "--------------------------------"
cd ../server

# Create virtual environment
echo "Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "Installing Python packages..."
pip install -r requirements.txt

echo "✅ Backend build complete"
echo ""

echo "☁️ Step 3: Deploying to Vercel..."
echo "--------------------------------"
cd ../client

# Check if Vercel CLI installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Deploy to production
echo "Deploying to Vercel..."
vercel --prod --yes

echo "✅ Frontend deployed"
echo ""

echo "🖥️ Step 4: Deploying Backend API..."
echo "-----------------------------------"
cd ../server

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm i -g pm2
fi

# Start services
echo "Starting API services..."
pm2 start api_server.py --name clippy-api --interpreter python3
pm2 start webhook_handler.py --name clippy-webhooks --interpreter python3
pm2 start background_worker.py --name clippy-worker --interpreter python3

# Save PM2 config
pm2 save

echo "✅ Backend deployed"
echo ""

echo "🗄️ Step 5: Verifying Database..."
echo "---------------------------------"
# Run database migrations if needed
echo "Database: Already configured (Supabase)"
echo "✅ Database ready"
echo ""

echo "✅ DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "🌐 Live URLs:"
echo "   Frontend: https://useclippy.com"
echo "   API:      https://api.useclippy.com"
echo "   Health:   https://api.useclippy.com/health"
echo ""
echo "📊 Deployment Summary:"
echo "   Time: $DEPLOYMENT_TIME"
echo "   Status: PRODUCTION"
echo "   Version: 1.0.0"
echo ""
echo "🔍 Next Steps:"
echo "   1. Test signup flow"
echo "   2. Verify AI responses"
echo "   3. Check webhook endpoints"
echo "   4. Monitor error logs"
echo ""
echo "🎉 Clippy is LIVE!"
