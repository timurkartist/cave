#!/bin/bash

# Quick health check script for production
# Usage: ./check-status.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="${1:-localhost}"
API_URL="https://$DOMAIN"

echo "🔍 Checking Cave Game Health..."
echo ""

# Check API health
echo -n "API Health:     "
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Check Frontend
echo -n "Frontend:       "
if curl -s "$API_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Check WebSocket
echo -n "WebSocket:      "
if timeout 3 curl -i -N \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Key: test" \
    -H "Sec-WebSocket-Version: 13" \
    "$API_URL/ws" 2>/dev/null | grep -q "101"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ Check manually${NC}"
fi

# Check PM2 processes
echo ""
echo "Process Status:"
echo -n "PM2 API:        "
pm2 describe cave-game-api > /dev/null 2>&1 && echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Not found${NC}"
echo -n "PM2 Frontend:   "
pm2 describe cave-game-frontend > /dev/null 2>&1 && echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Not found${NC}"

# Check system resources
echo ""
echo "System Resources:"
MEMORY=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
DISK=$(df -h / | awk 'NR==2 {print $5}')
echo "Memory Usage:   $MEMORY%"
echo "Disk Usage:     $DISK"

# Check SSL certificate
echo ""
echo -n "SSL Certificate: "
CERT_DATE=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ ! -z "$CERT_DATE" ]; then
    echo "Valid until $CERT_DATE"
else
    echo -e "${YELLOW}⚠ Unable to verify${NC}"
fi

echo ""
echo "✅ Health check complete"
