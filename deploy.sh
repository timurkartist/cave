#!/bin/bash

# Cave Game - Hetzner Deployment Script
# This script automates the deployment process to Hetzner

set -e

echo "🚀 Starting Cave Game deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/timurkartist/cave.git"
DEPLOY_DIR="/home/cave-game"
APP_NAME="cave-game"
DOMAIN="keep-it-all.com"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[ℹ]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "This script must be run as root"
    exit 1
fi

# Update system
print_info "Updating system packages..."
apt-get update
apt-get upgrade -y
print_status "System updated"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    print_status "Node.js installed"
else
    print_status "Node.js already installed: $(node --version)"
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    print_status "Nginx installed"
else
    print_status "Nginx already installed"
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    npm install -g pm2
    pm2 startup
    print_status "PM2 installed"
else
    print_status "PM2 already installed"
fi

# Install Certbot for SSL if not present
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
    print_status "Certbot installed"
else
    print_status "Certbot already installed"
fi

# Create deployment directory
if [ ! -d "$DEPLOY_DIR" ]; then
    print_info "Creating deployment directory..."
    mkdir -p "$DEPLOY_DIR"
    print_status "Deployment directory created"
fi

# Clone or pull repository
cd "$DEPLOY_DIR"
if [ -d ".git" ]; then
    print_info "Pulling latest code..."
    git pull origin main
else
    print_info "Cloning repository..."
    git clone "$REPO_URL" .
fi
print_status "Code synced"

# Install dependencies
print_info "Installing dependencies..."
npm ci --omit=dev
print_status "Dependencies installed"

# Build frontend
print_info "Building frontend..."
npm run build
print_status "Frontend built"

# Setup SSL certificate
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_info "Setting up SSL certificate for $DOMAIN..."
    certbot certonly --standalone -d "$DOMAIN" --email admin@"$DOMAIN" --agree-tos --non-interactive
    print_status "SSL certificate created"
else
    print_status "SSL certificate already exists"
fi

# Copy and configure Nginx
print_info "Configuring Nginx..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf
cp nginx.conf /etc/nginx/sites-available/cave-game
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/cave-game /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
print_status "Nginx configured and restarted"

# Copy environment file
print_info "Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.hetzner .env
    print_error "Please edit .env with your actual configuration values"
    print_info "Edit the file: $DEPLOY_DIR/.env"
fi

# Setup PM2
print_info "Configuring PM2..."
pm2 delete cave-game-api cave-game-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup -u root --hp /root
print_status "PM2 configured"

# Create log directory
mkdir -p /var/log/pm2
chmod 755 /var/log/pm2

# Setup automatic SSL renewal
print_info "Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
print_status "SSL renewal scheduled"

# Setup git auto-deployment (optional)
print_info "Setting up deployment hook..."
mkdir -p /home/cave-game/.git/hooks
cat > /home/cave-game/.git/hooks/post-receive << 'EOF'
#!/bin/bash
cd /home/cave-game
git checkout -f
npm ci --omit=dev
npm run build
pm2 restart ecosystem.config.js
EOF
chmod +x /home/cave-game/.git/hooks/post-receive
print_status "Deployment hook configured"

# Firewall configuration
print_info "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_status "Firewall configured"

print_status "✨ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your configuration:"
echo "   vi $DEPLOY_DIR/.env"
echo ""
echo "2. Check status:"
echo "   pm2 status"
echo ""
echo "3. View logs:"
echo "   pm2 logs"
echo ""
echo "4. Your application is available at: https://$DOMAIN"
echo ""
