# EC2 Manual Deployment Guide

This guide provides a step-by-step manual process to deploy the **We Care Saathi Backend** on an AWS EC2 Ubuntu instance.

## 📋 Prerequisites

1.  **AWS EC2 Instance**: Ubuntu 22.04 LTS (`t3.medium` recommended).
2.  **Domain Name**: Pointed to your EC2 Public IP (A Record).
3.  **SSH Access**: You can log in to your server.

---

## 🚀 Step 1: Server Setup

Connect to your server:

```bash
ssh -i your-key.pem ubuntu@your-server-ip
```

Update system and install dependencies:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL, Redis, Nginx, git, certbot
sudo apt install -y postgresql postgresql-contrib redis-server nginx git certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2
```

---

## 🗄️ Step 2: Database Setup

Configure PostgreSQL:

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Access Postgres prompt
sudo -u postgres psql

# Run the following SQL commands (inside psql):
CREATE DATABASE we_care_db;
CREATE USER wecare_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE we_care_db TO wecare_admin;
ALTER DATABASE we_care_db OWNER TO wecare_admin;
\c we_care_db
GRANT ALL ON SCHEMA public TO wecare_admin;
\q
```

Configure Redis (Optional security):

```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Find and uncomment 'requirepass', set your password:
# requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
```

---

## 📦 Step 3: Application Deployment

Clone and setup the project:

```bash
# Clone repository (replace with your repo URL)
git clone https://github.com/msubham193/wecare-saathi.git
cd wecare-saathi

# Install dependencies
npm ci

# Setup Environment Variables
cp .env.example .env
nano .env
```

**Update `.env` values:**

```env
DATABASE_URL="postgresql://wecare_admin:your_secure_password@localhost:5432/we_care_db"
REDIS_PASSWORD="your_redis_password"
# ... update other secrets (Firebase, JWT, Google OAuth, S3)
```

Build and Deploy:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build the project
npm run build

# Start with PM2
pm2 start dist/server.js --name "we-care-backend"
pm2 save
pm2 startup
# (Run the command output by pm2 startup)
```

---

## 🌐 Step 4: Nginx & SSL Setup

Configure Nginx as Reverse Proxy:

```bash
# Create config file
sudo nano /etc/nginx/sites-available/we-care-saathi

# Paste the following config:
```

```nginx
server {
    server_name api.yourdomain.com; # REPLACE with your domain

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/we-care-saathi /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Setup SSL (HTTPS):

```bash
sudo certbot --nginx -d api.yourdomain.com
# Follow the prompts (enter email, agree to TOS)
```

---

## ✅ Step 5: Verification

1.  **Check Status**: `pm2 status`
2.  **Check Logs**: `pm2 logs`
3.  **Test API**: Visit `https://api.yourdomain.com/health` in your browser.

**Done! Your backend is live.** 🚀
