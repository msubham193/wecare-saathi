#!/bin/bash
# Monitoring and Logging Setup

set -e

echo "📊 Setting up monitoring and logging..."

APP_DIR="$HOME/we-care-saathi-backend"

# Install PM2 log rotation
echo "Installing PM2 log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:workerInterval 30

# Set up system log rotation for application logs
echo "Configuring system log rotation..."
sudo tee /etc/logrotate.d/we-care-saathi <<EOF
${APP_DIR}/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0640 ${USER} ${USER}
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Set up log rotation for Nginx
sudo tee /etc/logrotate.d/nginx-we-care <<EOF
/var/log/nginx/we-care-*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 \$(cat /var/run/nginx.pid)
    endscript
}
EOF

# Test logrotate configuration
echo "Testing logrotate configuration..."
sudo logrotate -d /etc/logrotate.d/we-care-saathi
sudo logrotate -d /etc/logrotate.d/nginx-we-care

# Save PM2 process list for auto-restart on reboot
echo "Configuring PM2 startup..."
pm2 startup systemd -u ${USER} --hp ${HOME}

echo ""
echo "✅ Monitoring and logging setup completed!"
echo ""
echo "PM2 log rotation settings:"
pm2 conf pm2-logrotate
echo ""
echo "📝 To enable PM2 auto-start, run the command shown above (if any)"
echo "📝 Next step: Run ./09-backup-setup.sh"
