#!/bin/bash
# Database Backup Setup

set -e

echo "💾 Setting up database backups..."

# Create backup directory
BACKUP_DIR="$HOME/backups"
mkdir -p "$BACKUP_DIR"

# Get database credentials
DB_NAME="we_care_db"
DB_USER="wecare_admin"
CREDS_FILE="$HOME/db-credentials.txt"

if [ ! -f "$CREDS_FILE" ]; then
    echo "❌ Database credentials file not found: $CREDS_FILE"
    echo "Please run ./02-database-setup.sh first"
    exit 1
fi

# Create backup script
BACKUP_SCRIPT="$HOME/backup-database.sh"
tee "$BACKUP_SCRIPT" <<EOF
#!/bin/bash
# Automated Database Backup Script

BACKUP_DIR="$BACKUP_DIR"
DATE=\$(date +%Y%m%d_%H%M%S)
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
RETENTION_DAYS=7

# Create backup with compression
echo "\$(date): Starting backup..."
pg_dump -U \$DB_USER -h localhost \$DB_NAME | gzip > "\$BACKUP_DIR/backup_\${DATE}.sql.gz"

if [ \$? -eq 0 ]; then
    echo "\$(date): Backup completed successfully: backup_\${DATE}.sql.gz"
    BACKUP_SIZE=\$(du -h "\$BACKUP_DIR/backup_\${DATE}.sql.gz" | cut -f1)
    echo "\$(date): Backup size: \$BACKUP_SIZE"
else
    echo "\$(date): ERROR: Backup failed!"
    exit 1
fi

# Delete backups older than retention period
echo "\$(date): Cleaning old backups (keeping \${RETENTION_DAYS} days)..."
find "\$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +\${RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=\$(ls -1 "\$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | wc -l)
echo "\$(date): Total backups: \$BACKUP_COUNT"
echo "---"
EOF

chmod +x "$BACKUP_SCRIPT"

# Create restore script
RESTORE_SCRIPT="$HOME/restore-database.sh"
tee "$RESTORE_SCRIPT" <<EOF
#!/bin/bash
# Database Restore Script

BACKUP_FILE="\$1"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"

if [ -z "\$BACKUP_FILE" ]; then
    echo "Usage: ./restore-database.sh /path/to/backup_YYYYMMDD_HHMMSS.sql.gz"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

if [ ! -f "\$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: \$BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore the database from backup!"
echo "Database: \$DB_NAME"
echo "Backup file: \$BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no) " -r
if [ "\$REPLY" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Restoring database..."
gunzip -c "\$BACKUP_FILE" | psql -U \$DB_USER -h localhost \$DB_NAME

if [ \$? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ Database restore failed!"
    exit 1
fi
EOF

chmod +x "$RESTORE_SCRIPT"

# Run initial backup
echo "Running initial backup..."
"$BACKUP_SCRIPT"

# Add to crontab (daily at 2 AM)
echo "Setting up automated daily backups..."
CRON_JOB="0 2 * * * $BACKUP_SCRIPT >> $HOME/backup.log 2>&1"

# Remove existing cron job if present
(crontab -l 2>/dev/null | grep -v "backup-database.sh") | crontab -

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ Backup setup completed!"
echo ""
echo "📁 Backup directory: $BACKUP_DIR"
echo "📝 Backup script: $BACKUP_SCRIPT"
echo "📝 Restore script: $RESTORE_SCRIPT"
echo "⏰ Scheduled: Daily at 2:00 AM"
echo "🗑️  Retention: 7 days"
echo ""
echo "Manual backup: $BACKUP_SCRIPT"
echo "Restore backup: $RESTORE_SCRIPT /path/to/backup.sql.gz"
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups yet"
