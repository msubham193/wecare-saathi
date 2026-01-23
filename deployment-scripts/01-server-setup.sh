#!/bin/bash
# Server Setup Script for We Care Saathi Backend
# Run this on fresh Ubuntu 22.04 EC2 instance

set -e

echo "🚀 Starting server setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15
echo "📦 Installing PostgreSQL 15..."
sudo apt install -y postgresql postgresql-contrib

# Install Redis
echo "📦 Installing Redis..."
sudo apt install -y redis-server

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install other utilities
echo "📦 Installing system utilities..."
sudo apt install -y git ufw fail2ban certbot python3-certbot-nginx htop

# Verify installations
echo ""
echo "✅ Verifying installations..."
echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"
echo "PostgreSQL version: $(psql --version)"
echo "Redis version: $(redis-server --version)"
echo "Nginx version: $(nginx -v 2>&1)"
echo "PM2 version: $(pm2 -v)"

echo ""
echo "✅ Server setup completed successfully!"
echo "📝 Next step: Run ./02-database-setup.sh"
