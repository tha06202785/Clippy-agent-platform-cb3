#!/bin/bash

# VPS Deployment Script for Clippy Platform with Widget
# This builds the frontend, sets up the backend, and deploys to VPS

set -e

echo "🧷 Clippy Platform + Widget VPS Deploy"
echo "======================================="
echo ""

# Configuration
VPS_HOST="${VPS_HOST:-your-vps-ip}"
VPS_USER="${VPS_USER:-root}"
DOMAIN="${DOMAIN:-useclippy.com}"
APP_DIR="/var/www/clippy"
NGINX_CONF="/etc/nginx/sites-available/clippy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 not found. Please install Python 3.11+"
        exit 1
    fi
    
    if [ ! -f "client/package.json" ]; then
        log_error "client/package.json not found. Are you in the right directory?"
        exit 1
    fi
    
    log_info "Prerequisites OK"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    
    cd client
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm install
    
    # Copy widget to public folder
    log_info "Setting up widget..."
    cp /root/.openclaw/workspace/clippy-widget/clippy-widget.js public/
    
    # Build
    log_info "Building production bundle..."
    npm run build
    
    cd ..
    log_info "Frontend build complete"
}

# Setup backend
setup_backend() {
    log_info "Setting up backend..."
    
    cd server
    
    # Create virtual environment if not exists
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    # Activate and install dependencies
    source venv/bin/activate
    pip install -r requirements.txt
    
    cd ..
    log_info "Backend setup complete"
}

# Create deployment package
create_package() {
    log_info "Creating deployment package..."
    
    DEPLOY_DIR="clippy-deploy-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$DEPLOY_DIR"
    
    # Copy frontend build
    cp -r client/dist "$DEPLOY_DIR/frontend"
    
    # Copy backend
    cp -r server "$DEPLOY_DIR/backend"
    
    # Copy widget
    cp /root/.openclaw/workspace/clippy-widget/clippy-widget.js "$DEPLOY_DIR/frontend/"
    
    # Create systemd service file
    cat > "$DEPLOY_DIR/clippy-backend.service" << EOF
[Unit]
Description=Clippy Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/backend
Environment=PATH=$APP_DIR/backend/venv/bin
ExecStart=$APP_DIR/backend/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:5000 api_server:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    
    # Create Nginx config
    cat > "$DEPLOY_DIR/nginx.conf" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL certificates (use certbot to generate)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Frontend
    location / {
        root $APP_DIR/frontend;
        try_files \$uri \$uri/ /index.html;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Widget endpoint (public)
    location /api/widget/chat {
        proxy_pass http://127.0.0.1:5000/api/widget/chat;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        
        # CORS headers for widget
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type' always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    # Widget JavaScript file
    location /clippy-widget.js {
        alias $APP_DIR/frontend/clippy-widget.js;
        add_header Content-Type "application/javascript";
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Create deploy script for VPS
    cat > "$DEPLOY_DIR/deploy-on-vps.sh" << 'EOF'
#!/bin/bash
set -e

echo "Deploying Clippy on VPS..."

APP_DIR="/var/www/clippy"

# Create directory
mkdir -p $APP_DIR

# Copy files
rm -rf $APP_DIR/*
cp -r frontend $APP_DIR/
cp -r backend $APP_DIR/

# Setup permissions
chown -R www-data:www-data $APP_DIR

# Install backend dependencies
cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt

# Setup systemd service
cp ../clippy-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable clippy-backend
systemctl restart clippy-backend

# Setup Nginx
cp ../nginx.conf /etc/nginx/sites-available/clippy
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/clippy /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "Deployment complete!"
echo "Check status: systemctl status clippy-backend"
EOF

    chmod +x "$DEPLOY_DIR/deploy-on-vps.sh"
    
    # Create tarball
    tar -czf "$DEPLOY_DIR.tar.gz" "$DEPLOY_DIR"
    rm -rf "$DEPLOY_DIR"
    
    log_info "Package created: $DEPLOY_DIR.tar.gz"
}

# Deploy to VPS
deploy_to_vps() {
    log_info "Deploying to VPS..."
    
    DEPLOY_FILE="$(ls -t clippy-deploy-*.tar.gz | head -1)"
    
    if [ -z "$DEPLOY_FILE" ]; then
        log_error "No deployment package found"
        exit 1
    fi
    
    # Copy to VPS
    log_info "Copying files to VPS..."
    scp "$DEPLOY_FILE" $VPS_USER@$VPS_HOST:/tmp/
    
    # Extract and run deploy script
    log_info "Running deployment on VPS..."
    ssh $VPS_USER@$VPS_HOST "
        cd /tmp
        tar -xzf $DEPLOY_FILE
        cd clippy-deploy-*
        bash deploy-on-vps.sh
    "
    
    log_info "Deployment complete!"
    log_info "Your widget is available at: https://$DOMAIN/widget"
    log_info "Widget JS: https://$DOMAIN/clippy-widget.js"
    log_info "Widget API: https://$DOMAIN/api/widget/chat"
}

# Main
main() {
    echo ""
    log_info "Starting deployment process..."
    echo ""
    
    check_prerequisites
    build_frontend
    setup_backend
    create_package
    
    echo ""
    log_info "Local build complete!"
    echo ""
    
    read -p "Deploy to VPS ($VPS_HOST)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_to_vps
    else
        log_info "Skipping VPS deployment"
        log_info "Deployment package ready for manual upload"
    fi
}

main "$@"