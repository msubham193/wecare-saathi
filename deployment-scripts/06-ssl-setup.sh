#!/bin/bash
# SSL Setup Script (requires domain name)

set -e

DOMAIN="${1}"
EMAIL="${2:-admin@example.com}"

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "localhost" ]; then
    echo "❌ Error: Valid domain name required for SSL setup"
    echo "Usage: ./06-ssl-setup.sh your-domain.com your-email@example.com"
    echo ""
    echo "⚠️  Skipping SSL setup. You can run this later when you have a domain."
    exit 0
fi

echo "🔒 Setting up SSL certificate for ${DOMAIN}..."

# Check if domain resolves to this server
echo "Checking DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo "⚠️  WARNING: Domain $DOMAIN does not point to this server"
    echo "   Server IP: $SERVER_IP"
    echo "   Domain IP: $DOMAIN_IP"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Obtain SSL certificate
echo "Requesting SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    --redirect

# Set up auto-renewal
echo "Configuring certificate auto-renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
echo "Testing certificate renewal..."
sudo certbot renew --dry-run

echo ""
echo "✅ SSL setup completed successfully!"
echo "🔒 SSL certificate installed for: $DOMAIN"
echo "📧 Renewal notifications will be sent to: $EMAIL"
echo "🔄 Auto-renewal is enabled (checks twice daily)"
echo ""
echo "📝 Next step: Run ./07-firewall-setup.sh"
