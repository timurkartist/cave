#!/bin/bash

# Automated backup script
# Usage: ./backup.sh [backup_dir]

BACKUP_DIR="${1:-.}/backups"
DEPLOY_DIR="/home/cave-game"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cave-game_$TIMESTAMP.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup..."
echo "Location: $BACKUP_FILE"

# Create backup
tar -czf "$BACKUP_FILE" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    "$DEPLOY_DIR" 2>/dev/null

# Backup .env separately (encrypted)
if [ -f "$DEPLOY_DIR/.env" ]; then
    gpg --symmetric --cipher-algo AES256 -o "$BACKUP_DIR/cave-game_$TIMESTAMP.env.gpg" "$DEPLOY_DIR/.env" 2>/dev/null || \
    cp "$DEPLOY_DIR/.env" "$BACKUP_DIR/cave-game_$TIMESTAMP.env"
fi

echo "✅ Backup complete!"
echo ""
echo "Size: $(du -h $BACKUP_FILE | cut -f1)"
echo ""
echo "To restore:"
echo "  tar -xzf $BACKUP_FILE -C /"
echo "  pm2 restart ecosystem.config.js"
