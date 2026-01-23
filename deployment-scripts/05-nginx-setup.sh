#!/bin/bash
# Nginx Setup Script

set -e

echo "🌐 Setting up Nginx reverse proxy..."

# Get domain/IP from argument or use localhost
DOMAIN="${1}"

if [ -z "$DOMAIN" ]; then
    echo "⚠️  No domain specified, using localhost configuration"
    DOMAIN="localhost"
    SERVER_NAME="_"
else
    SERVER_NAME="$DOMAIN"
fi

echo "Configuring Nginx for: $DOMAIN"

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/we-care-saathi <<EOF
# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone \$binary_remote_addr zone=sos_limit:10m rate=10r/m;

# Upstream Node.js application
upstream we_care_backend {
    least_conn;
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name ${SERVER_NAME};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/we-care-access.log;
    error_log /var/log/nginx/we-care-error.log;

    # Client body size for file uploads
    client_max_body_size 50M;
    client_body_timeout 300s;

    # API endpoints
    location / {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://we_care_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Timeouts
        proxy_send_timeout 300s;
    }

    # Socket.IO WebSocket endpoint
    location /socket.io/ {
        proxy_pass http://we_care_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SOS endpoint with stricter rate limiting
    location /api/v1/sos {
        limit_req zone=sos_limit burst=5 nodelay;
        
        proxy_pass http://we_care_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://we_care_backend;
        access_log off;
    }

    # API Documentation
    location /api-docs {
        proxy_pass http://we_care_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

# Enable site
echo "Enabling Nginx site configuration..."
sudo ln -sf /etc/nginx/sites-available/we-care-saathi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors!"
    exit 1
fi

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "✅ Nginx setup completed successfully!"
echo "📝 Configuration file: /etc/nginx/sites-available/we-care-saathi"
echo "🌐 Server configured for: $DOMAIN"
echo ""
if [ "$DOMAIN" != "localhost" ]; then
    echo "📝 Next step: Run ./06-ssl-setup.sh $DOMAIN your-email@example.com"
else
    echo "📝 Next step: Run ./07-firewall-setup.sh"
fi
