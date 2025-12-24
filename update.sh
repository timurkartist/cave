#!/bin/bash

# Update script - safe way to update the application
# Usage: ./update.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_DIR="/home/cave-game"

echo -e "${YELLOW}🔄 Starting application update...${NC}"

# Create backup before update
echo "📦 Creating backup..."
./backup.sh /tmp/cave-game-backups

# Go to deployment directory
cd "$DEPLOY_DIR" || exit 1

# Pull latest code
echo -e "\n${YELLOW}📥 Pulling latest code...${NC}"
git fetch origin
git reset --hard origin/main
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Code updated${NC}"
else
    echo -e "${RED}✗ Failed to pull code${NC}"
    exit 1
fi

# Install dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
npm ci --omit=dev
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Build frontend
echo -e "\n${YELLOW}🔨 Building frontend...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend built${NC}"
else
    echo -e "${RED}✗ Failed to build frontend${NC}"
    exit 1
fi

# Restart application
echo -e "\n${YELLOW}🔄 Restarting application...${NC}"
pm2 restart ecosystem.config.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Application restarted${NC}"
else
    echo -e "${RED}✗ Failed to restart application${NC}"
    exit 1
fi

# Wait for startup
echo "⏳ Waiting for application to start..."
sleep 5

# Check health
echo -e "\n${YELLOW}🏥 Checking application health...${NC}"
if curl -s https://your-domain.com/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
    echo -e "\n${GREEN}✅ Update complete!${NC}"
else
    echo -e "${YELLOW}⚠ Health check inconclusive, check logs${NC}"
    echo "Run: pm2 logs"
fi
