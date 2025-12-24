#!/bin/bash

# Configure automatic updates and security
# Run this after initial deployment

set -e

echo "🔒 Configuring security and updates..."

# Update system packages daily
echo "Creating daily system update cron job..."
cat > /etc/cron.d/system-update << EOF
# Daily system updates
0 2 * * * root apt-get update && apt-get upgrade -y >> /var/log/system-update.log 2>&1
EOF

# Update application weekly
echo "Creating weekly application update cron job..."
cat > /etc/cron.d/app-update << EOF
# Weekly application update
0 3 * * 0 root cd /home/cave-game && ./update.sh >> /var/log/app-update.log 2>&1
EOF

# Daily backup
echo "Creating daily backup cron job..."
mkdir -p /home/cave-game/backups
cat > /etc/cron.d/daily-backup << EOF
# Daily backup at 4 AM
0 4 * * * root /home/cave-game/backup.sh >> /var/log/backup.log 2>&1
EOF

# Cleanup old backups (keep last 7 days)
echo "Setting up backup cleanup..."
cat > /etc/cron.d/cleanup-backups << EOF
# Clean up backups older than 7 days
0 5 * * * root find /home/cave-game/backups -name "*.tar.gz" -mtime +7 -delete
EOF

# Renew SSL certificate
echo "SSL certificate renewal is handled by Certbot automatically"

# Security: Disable root SSH login
echo "Hardening SSH configuration..."
if grep -q "^PermitRootLogin" /etc/ssh/sshd_config; then
    sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
else
    echo "PermitRootLogin no" >> /etc/ssh/sshd_config
fi

# Disable password authentication (use keys only)
if grep -q "^PasswordAuthentication" /etc/ssh/sshd_config; then
    sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
else
    echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
fi

systemctl reload ssh

# Setup monitoring
echo "Setting up monitoring..."
npm install -g pm2-monitoring-agent || true

# Install fail2ban for brute force protection
apt-get install -y fail2ban

# Create fail2ban config for Nginx
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

systemctl restart fail2ban

echo "✅ Security configuration complete!"
echo ""
echo "Configured:"
echo "  ✓ Daily system updates (2 AM)"
echo "  ✓ Weekly application updates (Sunday 3 AM)"
echo "  ✓ Daily backups (4 AM)"
echo "  ✓ Backup cleanup (5 AM)"
echo "  ✓ Automated SSL renewal"
echo "  ✓ SSH hardening"
echo "  ✓ Fail2ban protection"
echo ""
echo "View scheduled jobs:"
echo "  crontab -l"
echo ""
echo "View logs:"
echo "  tail -f /var/log/system-update.log"
echo "  tail -f /var/log/app-update.log"
echo "  tail -f /var/log/backup.log"
