#!/bin/bash
# Application Deployment Script

set -e

echo "🚀 Deploying We Care Saathi Backend..."

# Set variables
APP_DIR="$HOME/we-care-saathi-backend"
REPO_URL="${1:-https://github.com/YOUR_USERNAME/we-care-saathi-backend.git}"

if [ "$REPO_URL" = "https://github.com/YOUR_USERNAME/we-care-saathi-backend.git" ]; then
    echo "⚠️  WARNING: Using placeholder repository URL"
    echo "Usage: ./04-app-deployment.sh https://github.com/your-username/your-repo.git"
    echo ""
fi

# Clone or update repository
if [ -d "$APP_DIR" ]; then
    echo "📦 Updating existing repository..."
    cd "$APP_DIR"
    git pull origin main || git pull origin master
else
    echo "📦 Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "📦 Installing dependencies..."
npm ci --production

echo "🔨 Generating Prisma Client..."
npx prisma generate

echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

echo ""
echo "✅ Application deployment completed!"
echo "📁 Application directory: $APP_DIR"
echo ""
echo "📝 Next steps:"
echo "   1. Create .env file: cp .env.example .env"
echo "   2. Update .env with production credentials"
echo "   3. Run database migrations: npx prisma migrate deploy"
echo "   4. Continue with: ./05-nginx-setup.sh your-domain.com"
