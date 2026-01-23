#!/bin/bash
# Redis Setup Script

set -e

echo "📦 Setting up Redis..."

# Generate Redis password
REDIS_PASSWORD="$(openssl rand -base64 32)"

echo "Configuring Redis with password..."

# Configure Redis
sudo sed -i "s/# requirepass foobared/requirepass ${REDIS_PASSWORD}/" /etc/redis/redis.conf
sudo sed -i "s/bind 127.0.0.1 ::1/bind 127.0.0.1/" /etc/redis/redis.conf
sudo sed -i "s/# maxmemory <bytes>/maxmemory 512mb/" /etc/redis/redis.conf
sudo sed -i "s/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf

# Enable persistence
sudo sed -i "s/save \"\"/save 900 1\nsave 300 10\nsave 60 10000/" /etc/redis/redis.conf

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Save credentials to file
CREDS_FILE="$HOME/db-credentials.txt"
echo "" >> "$CREDS_FILE"
echo "REDIS_URL=redis://localhost:6379" >> "$CREDS_FILE"
echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >> "$CREDS_FILE"

# Test Redis connection
echo "Testing Redis connection..."
if redis-cli -a "${REDIS_PASSWORD}" ping | grep -q "PONG"; then
    echo "✅ Redis connection test successful!"
else
    echo "❌ Redis connection test failed!"
    exit 1
fi

echo ""
echo "✅ Redis setup completed successfully!"
echo "📝 Redis credentials appended to: $CREDS_FILE"
echo ""
echo "Redis details:"
echo "  Host: localhost"
echo "  Port: 6379"
echo "  Max Memory: 512MB"
echo "  Eviction Policy: allkeys-lru"
echo ""
echo "📝 Next step: Run ./04-app-deployment.sh"
