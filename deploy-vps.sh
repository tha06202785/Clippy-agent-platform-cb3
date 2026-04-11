#!/bin/bash
# ============================================================================
# Clippy VPS Deployment Script
# Run this on the VPS to deploy Clippy
# ============================================================================

set -e  # Exit on error

# Configuration
APP_DIR="/opt/clippy"
GITHUB_REPO="https://github.com/tha06202785/Clippy-agent-platform-cb3.git"
NODE_VERSION="20"
APP_PORT="3000"

echo "🚀 Clippy VPS Deployment Script"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js
echo "📦 Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# Verify Node.js
node_version=$(node --version)
echo "✅ Node.js installed: ${node_version}"

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git if not present
echo "📦 Installing Git..."
apt install -y git

# Create app directory
echo "📁 Creating app directory..."
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Clone repository (or pull if exists)
if [ -d ".git" ]; then
  echo "📥 Pulling latest code..."
  git pull origin master
else
  echo "📥 Cloning repository..."
  git clone ${GITHUB_REPO} .
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists, create from example if not
if [ ! -f ".env" ]; then
  echo "⚠️  .env file not found!"
  echo "📝 Creating from .env.example..."
  cp .env.example .env
  echo "⚠️  IMPORTANT: Please edit .env file with your actual API keys!"
  echo "⚠️  File location: ${APP_DIR}/.env"
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Setup PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'clippy',
      script: './dist/server/node-build.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 5,
      min_uptime: '10s'
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

# Save PM2 config
pm2 save

# Setup PM2 startup script
echo "⚙️  Setting up PM2 startup..."
pm2 startup systemd -u root --hp /root

# Configure firewall
echo "🔒 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow ${APP_PORT}/tcp
ufw --force enable

echo ""
echo "✅ Deployment Complete!"
echo "===================="
echo ""
echo "📋 Next Steps:"
echo "1. Edit environment variables: nano ${APP_DIR}/.env"
echo "2. Start the app: pm2 start ecosystem.config.js"
echo "3. Save PM2 config: pm2 save"
echo "4. Check status: pm2 status"
echo ""
echo "🌐 App will be available at:"
echo "   - http://YOUR_VPS_IP:${APP_PORT}"
echo "   - http://YOUR_VPS_IP (if using nginx)"
echo ""
echo "📁 Installation directory: ${APP_DIR}"
echo "📊 Logs directory: ${APP_DIR}/logs"
echo ""
echo "🔧 Useful Commands:"
echo "   pm2 status          - Check app status"
echo "   pm2 logs clippy     - View logs"
echo "   pm2 restart clippy  - Restart app"
echo "   pm2 stop clippy     - Stop app"
echo ""
