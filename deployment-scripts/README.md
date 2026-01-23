# EC2 Deployment Scripts

Automated deployment scripts for deploying **We Care Saathi Backend** to AWS EC2 Ubuntu instance.

## 📋 Prerequisites

Before running these scripts, ensure you have:

1. **AWS EC2 Instance**
   - Ubuntu 22.04 LTS
   - Recommended: t3.medium or t3.large
   - 30-50 GB SSD storage
   - SSH access configured

2. **Required Credentials**
   - ✅ Firebase Admin SDK (service account JSON)
   - ✅ AWS S3 bucket and IAM credentials
   - ⏭️ WhatsApp Business API (optional - skip for now)
   - ⏭️ SMS Provider (optional - skip for now)

3. **Domain Name** (optional but recommended)
   - DNS configured to point to EC2 IP
   - Access to DNS settings for SSL

## 🚀 Quick Start

### Option 1: One-Command Deployment

Run the master deployment script that executes all steps:

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone your repository
git clone https://github.com/YOUR_USERNAME/we-care-saathi-backend.git
cd we-care-saathi-backend/deployment-scripts

# Make scripts executable
chmod +x *.sh

# Run complete deployment
./deploy.sh https://github.com/YOUR_USERNAME/we-care-saathi-backend.git api.yourdomain.com admin@example.com
```

### Option 2: Step-by-Step Deployment

Run each script individually:

```bash
# 1. Install system dependencies
./01-server-setup.sh

# 2. Setup PostgreSQL database
./02-database-setup.sh

# 3. Setup Redis
./03-redis-setup.sh

# 4. Deploy application
./04-app-deployment.sh https://github.com/YOUR_USERNAME/we-care-saathi-backend.git

# 5. Configure Nginx
./05-nginx-setup.sh api.yourdomain.com

# 6. Setup SSL (optional if you have domain)
./06-ssl-setup.sh api.yourdomain.com admin@example.com

# 7. Configure firewall
./07-firewall-setup.sh

# 8. Setup monitoring
./08-monitoring-setup.sh

# 9. Setup database backups
./09-backup-setup.sh
```

## 📝 Scripts Overview

| Script                   | Purpose                                         | Duration  |
| ------------------------ | ----------------------------------------------- | --------- |
| `01-server-setup.sh`     | Install Node.js, PostgreSQL, Redis, Nginx, PM2  | 5-10 min  |
| `02-database-setup.sh`   | Create database, user, and configure PostgreSQL | 1-2 min   |
| `03-redis-setup.sh`      | Configure Redis with password and persistence   | 1 min     |
| `04-app-deployment.sh`   | Clone repo, install dependencies, build app     | 3-5 min   |
| `05-nginx-setup.sh`      | Configure Nginx reverse proxy                   | 1 min     |
| `06-ssl-setup.sh`        | Install SSL certificate with Let's Encrypt      | 2-3 min   |
| `07-firewall-setup.sh`   | Configure UFW and fail2ban                      | 1-2 min   |
| `08-monitoring-setup.sh` | Setup log rotation and PM2 monitoring           | 1 min     |
| `09-backup-setup.sh`     | Configure automated daily backups               | 1 min     |
| `deploy.sh`              | Run all scripts in sequence                     | 15-25 min |
| `health-check.sh`        | Verify all services are running                 | 30 sec    |

## ⚙️ Post-Deployment Configuration

### 1. Configure Environment Variables

```bash
cd ~/we-care-saathi-backend

# View database credentials
cat ~/db-credentials.txt

# Copy production env template
cp .env.production .env

# Edit environment file
nano .env
```

Update the following in `.env`:

#### Required Configuration:

```bash
# Database (from ~/db-credentials.txt)
DATABASE_URL=postgresql://wecare_admin:PASTE_PASSWORD@localhost:5432/we_care_db
REDIS_PASSWORD=PASTE_REDIS_PASSWORD

# JWT Secret (generate new)
JWT_SECRET=$(openssl rand -base64 64)

# Firebase (from Firebase Console service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com
FCM_SERVER_KEY=your-fcm-server-key

# AWS S3 (from AWS IAM console)
S3_BUCKET=we-care-evidence-prod
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCY
S3_REGION=ap-south-1

# CORS (your frontend domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

#### Optional (Skip for Now):

```bash
# Uncomment when ready
# SMS_PROVIDER_URL=...
# SMS_PROVIDER_API_KEY=...
# WHATSAPP_API_URL=...
# WHATSAPP_API_KEY=...
```

### 2. Run Database Migrations

```bash
cd ~/we-care-saathi-backend
npx prisma migrate deploy
```

### 3. Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable PM2 startup on boot
pm2 startup
# Run the command shown in output (with sudo)
```

### 4. Verify Deployment

```bash
cd ~/we-care-saathi-backend/deployment-scripts
./health-check.sh
```

Expected output:

```
🏥 Running health checks...
API Health:      ✅ OK
PostgreSQL:      ✅ OK
Redis:           ✅ OK
Nginx:           ✅ OK
PM2 App:         ✅ OK (2 instances online)
Disk Space:      ✅ OK (25% used)
Memory:          ✅ OK (45% used)

✅ All critical health checks passed!
```

## 🔧 Common Management Tasks

### Application Management

```bash
# View status
pm2 status

# View logs (live)
pm2 logs

# View logs (last 100 lines)
pm2 logs --lines 100

# Restart application
pm2 restart all

# Stop application
pm2 stop all

# Monitor resources
pm2 monit

# Clear logs
pm2 flush
```

### Update Application

```bash
cd ~/we-care-saathi-backend

# Pull latest changes
git pull

# Install new dependencies
npm ci --production

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart PM2
pm2 restart all
```

### Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx

# View access logs
sudo tail -f /var/log/nginx/we-care-access.log

# View error logs
sudo tail -f /var/log/nginx/we-care-error.log
```

### Database Management

```bash
# Access PostgreSQL
sudo -u postgres psql we_care_db

# Run manual backup
~/backup-database.sh

# Restore from backup
~/restore-database.sh ~/backups/backup_YYYYMMDD_HHMMSS.sql.gz

# View backup log
cat ~/backup.log
```

### Redis Management

```bash
# Access Redis CLI (get password from ~/db-credentials.txt)
redis-cli -a YOUR_REDIS_PASSWORD

# Check Redis status
sudo systemctl status redis-server

# Clear all Redis data (dangerous!)
redis-cli -a YOUR_REDIS_PASSWORD FLUSHALL
```

### Firewall Management

```bash
# View firewall status
sudo ufw status

# View fail2ban status
sudo fail2ban-client status

# Unban an IP
sudo fail2ban-client set sshd unbanip 1.2.3.4
```

## 🐛 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs --lines 50

# Check if .env exists
ls -la ~/we-care-saathi-backend/.env

# Verify database connection
cd ~/we-care-saathi-backend
npx prisma db pull
```

### Nginx 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check app logs
pm2 logs

# Verify port 5000 is listening
sudo netstat -tlnp | grep 5000

# Restart everything
pm2 restart all
sudo systemctl restart nginx
```

### Database connection error

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if database exists
sudo -u postgres psql -l | grep we_care

# Verify connection string in .env
cat ~/db-credentials.txt
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

### Out of disk space

```bash
# Check disk usage
df -h

# Find large files
sudo du -h / | sort -rh | head -20

# Clear PM2 logs
pm2 flush

# Clean old backups manually
ls -lh ~/backups/
rm ~/backups/backup_YYYYMMDD_*.sql.gz
```

## 📊 Monitoring

### Health Check

Run health check anytime:

```bash
~/we-care-saathi-backend/deployment-scripts/health-check.sh
```

### System Resources

```bash
# CPU and Memory
htop

# PM2 monitoring
pm2 monit

# Disk usage
df -h

# Memory usage
free -h

# Active connections
ss -tulpn
```

### Logs Location

- **Application logs**: `~/we-care-saathi-backend/logs/`
- **PM2 logs**: `~/we-care-saathi-backend/logs/pm2-*.log`
- **Nginx logs**: `/var/log/nginx/we-care-*.log`
- **System logs**: `/var/log/syslog`
- **Database backups**: `~/backups/`

## 🔐 Security Best Practices

1. **Never commit credentials to Git**

   ```bash
   # Verify .env is in .gitignore
   cat ~/we-care-saathi-backend/.gitignore | grep .env
   ```

2. **Rotate secrets regularly**
   - JWT secret every 90 days
   - Database passwords every 180 days
   - API keys when team members leave

3. **Keep system updated**

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Monitor fail2ban**

   ```bash
   sudo fail2ban-client status sshd
   ```

5. **Review firewall rules**
   ```bash
   sudo ufw status verbose
   ```

## 📚 Additional Resources

- [Deployment Plan](../../../brain/4e1b7f2c-9de3-43c8-ad9a-d68d88e0d72d/implementation_plan.md)
- [Prisma Migrations](https://www.prisma.io/docs/guides/migrate)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)

## ⚠️ Important Notes

- **SMS and WhatsApp**: Currently skipped. Configure later when needed.
- **Backups**: Automated daily at 2:00 AM, retained for 7 days
- **SSL Renewal**: Automated, checks twice daily
- **Log Rotation**: Automated, keeps 14 days
- **PM2 Restart**: Automatic on failure or server reboot

## 📞 Support

If you encounter issues:

1. Check logs: `pm2 logs` and `/var/log/nginx/we-care-error.log`
2. Run health check: `./health-check.sh`
3. Review troubleshooting section above
4. Check system resources: `htop` and `df -h`

---

**Made with ❤️ for Commissionerate Police Bhubaneswar-Cuttack**
