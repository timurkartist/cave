#!/bin/bash
cd /tmp/cave-app
rm -rf /var/www/keep-it-all/*
cp -r dist/* /var/www/keep-it-all/
chown -R www-data:www-data /var/www/keep-it-all/
echo "✅ Dist updated"
