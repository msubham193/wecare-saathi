#!/bin/bash
# Master Deployment Script
# Orchestrates the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get arguments
REPO_URL="${1}"
DOMAIN="${2}"
EMAIL="${3}"

echo -e "${BLUE}🚀 We Care Saathi Backend - Complete Deployment${NC}"
echo "=============================================="
echo ""

# Validation
if [ -z "$REPO_URL" ]; then
    echo -e "${YELLOW}⚠️  Repository URL not provided${NC}"
    echo "Usage: ./deploy.sh <repo-url> [domain] [email]"
    echo "Example: ./deploy.sh https://github.com/user/repo.git api.example.com admin@example.com"
    echo ""
    read -p "Continue with placeholder URL? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    REPO_URL="https://github.com/YOUR_USERNAME/we-care-saathi-backend.git"
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  Repository: $REPO_URL"
echo "  Domain: ${DOMAIN:-localhost (no domain)}"
echo "  Email: ${EMAIL:-not provided}"
echo ""

# Confirm before proceeding
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1/9: Server Setup${NC}"
echo "---"
./01-server-setup.sh

echo ""
echo -e "${BLUE}Step 2/9: Database Setup${NC}"
echo "---"
./02-database-setup.sh

echo ""
echo -e "${BLUE}Step 3/9: Redis Setup${NC}"
echo "---"
./03-redis-setup.sh

echo ""
echo -e "${BLUE}Step 4/9: Application Deployment${NC}"
echo "---"
./04-app-deployment.sh "$REPO_URL"

echo ""
echo -e "${BLUE}Step 5/9: Nginx Setup${NC}"
echo "---"
if [ -n "$DOMAIN" ]; then
    ./05-nginx-setup.sh "$DOMAIN"
else
    ./05-nginx-setup.sh
fi

echo ""
echo -e "${BLUE}Step 6/9: SSL Setup${NC}"
echo "---"
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
    ./06-ssl-setup.sh "$DOMAIN" "$EMAIL"
else
    echo -e "${YELLOW}⏭️  Skipping SSL setup (no domain provided)${NC}"
fi

echo ""
echo -e "${BLUE}Step 7/9: Firewall Setup${NC}"
echo "---"
./07-firewall-setup.sh

echo ""
echo -e "${BLUE}Step 8/9: Monitoring Setup${NC}"
echo "---"
./08-monitoring-setup.sh

echo ""
echo -e "${BLUE}Step 9/9: Backup Setup${NC}"
echo "---"
./09-backup-setup.sh

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 IMPORTANT: Next steps to start the application:${NC}"
echo ""
echo "1. Navigate to application directory:"
echo -e "   ${BLUE}cd ~/we-care-saathi-backend${NC}"
echo ""
echo "2. Copy database credentials to .env file:"
echo -e "   ${BLUE}cat ~/db-credentials.txt${NC}"
echo -e "   ${BLUE}cp .env.production .env${NC}"
echo -e "   ${BLUE}nano .env${NC}  # Edit with your credentials"
echo ""
echo "3. Update .env with:"
echo "   - Database URL and Redis password (from ~/db-credentials.txt)"
echo "   - Firebase credentials"
echo "   - AWS S3 credentials"
echo "   - JWT secret (generate with: openssl rand -base64 64)"
echo ""
echo "4. Run database migrations:"
echo -e "   ${BLUE}npx prisma migrate deploy${NC}"
echo ""
echo "5. Start the application with PM2:"
echo -e "   ${BLUE}pm2 start ecosystem.config.js${NC}"
echo -e "   ${BLUE}pm2 save${NC}"
echo ""
echo "6. Verify deployment:"
echo -e "   ${BLUE}./health-check.sh${NC}"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "   pm2 status              - Check application status"
echo "   pm2 logs                - View application logs"
echo "   pm2 restart all         - Restart application"
echo "   pm2 monit               - Monitor resources"
echo "   sudo systemctl status nginx - Check Nginx status"
echo "   sudo ufw status         - Check firewall rules"
echo ""
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
    echo -e "${GREEN}🌐 Your API will be available at: https://$DOMAIN${NC}"
else
    echo -e "${GREEN}🌐 Your API will be available at: http://$(curl -s ifconfig.me)${NC}"
fi
echo ""
