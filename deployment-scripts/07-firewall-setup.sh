#!/bin/bash
# Firewall and Security Setup

set -e

echo "🔒 Setting up firewall and security..."

# Configure UFW
echo "Configuring UFW firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential services
sudo ufw allow ssh comment 'SSH access'
sudo ufw allow http comment 'HTTP'
sudo ufw allow https comment 'HTTPS'

# Enable UFW
echo "Enabling firewall..."
echo "y" | sudo ufw enable

# Show firewall status
sudo ufw status verbose

# Configure fail2ban for SSH protection
echo ""
echo "Configuring fail2ban..."
sudo tee /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
destemail = admin@example.com
sendername = Fail2Ban

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/we-care-error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/we-care-error.log
maxretry = 10
EOF

# Start fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Show fail2ban status
echo ""
echo "Fail2ban status:"
sudo fail2ban-client status

echo ""
echo "✅ Firewall and security setup completed!"
echo ""
echo "Firewall rules:"
sudo ufw status numbered
echo ""
echo "📝 Next step: Run ./08-monitoring-setup.sh"
