#!/bin/bash
# Production Health Check Script

set -e

API_URL="${1:-http://localhost:5000}"

echo "🏥 Running health checks for We Care Saathi Backend..."
echo "API URL: $API_URL"
echo "=========================================="
echo ""

# Track failures
FAILURES=0

# Check API  response
echo -n "API Health:      "
if curl -s -f "${API_URL}/health" > /dev/null 2>&1; then
    RESPONSE=$(curl -s "${API_URL}/health")
    echo "✅ OK - $RESPONSE"
else
    echo "❌ FAILED - API not responding"
    ((FAILURES++))
fi

# Check PostgreSQL
echo -n "PostgreSQL:      "
if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | head -n1 | xargs)
    echo "✅ OK"
else
    echo "❌ FAILED"
    ((FAILURES++))
fi

# Check Redis
echo -n "Redis:           "
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ OK"
else
    # Try with auth if simple ping fails
    if [ -f "$HOME/db-credentials.txt" ]; then
        REDIS_PASS=$(grep "REDIS_PASSWORD=" "$HOME/db-credentials.txt" | cut -d'=' -f2)
        if redis-cli -a "$REDIS_PASS" ping > /dev/null 2>&1; then
            echo "✅ OK (authenticated)"
        else
            echo "❌ FAILED"
            ((FAILURES++))
        fi
    else
        echo "❌ FAILED"
        ((FAILURES++))
    fi
fi

# Check Nginx
echo -n "Nginx:           "
if sudo systemctl is-active --quiet nginx; then
    echo "✅ OK"
else
    echo "❌ FAILED"
    ((FAILURES++))
fi

# Check PM2
echo -n "PM2 App:         "
if pm2 list 2>/dev/null | grep -q "online"; then
    ONLINE_COUNT=$(pm2 list | grep -c "online" || echo "0")
    echo "✅ OK ($ONLINE_COUNT instances online)"
else
    echo "❌ FAILED - No PM2 processes running"
    ((FAILURES++))
fi

# Check disk space
echo -n "Disk Space:      "
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo "✅ OK (${DISK_USAGE}% used)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo "⚠️  WARNING (${DISK_USAGE}% used)"
else
    echo "❌ CRITICAL (${DISK_USAGE}% used)"
    ((FAILURES++))
fi

# Check memory usage
echo -n "Memory:          "
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -lt 85 ]; then
    echo "✅ OK (${MEM_USAGE}% used)"
elif [ "$MEM_USAGE" -lt 95 ]; then
    echo "⚠️  WARNING (${MEM_USAGE}% used)"
else
    echo "❌ CRITICAL (${MEM_USAGE}% used)"
    ((FAILURES++))
fi

# Check CPU load
echo -n "CPU Load:        "
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
CPU_CORES=$(nproc)
echo "✅ $CPU_LOAD (${CPU_CORES} cores available)"

# Check if .env file exists
echo -n ".env File:       "
if [ -f "$HOME/we-care-saathi-backend/.env" ]; then
    echo "✅ OK"
else
    echo "⚠️  WARNING - .env file not found"
fi

# Check logs directory
echo -n "Logs Directory:  "
if [ -d "$HOME/we-care-saathi-backend/logs" ]; then
    LOG_COUNT=$(ls -1 "$HOME/we-care-saathi-backend/logs"/*.log 2>/dev/null | wc -l)
    echo "✅ OK ($LOG_COUNT log files)"
else
    echo "⚠️  WARNING - logs directory not found"
fi

# Check backups
echo -n "Backups:         "
if [ -d "$HOME/backups" ]; then
    BACKUP_COUNT=$(ls -1 "$HOME/backups"/backup_*.sql.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        LATEST_BACKUP=$(ls -t "$HOME/backups"/backup_*.sql.gz 2>/dev/null | head -n1)
        BACKUP_AGE=$(find "$LATEST_BACKUP" -mtime -1 2>/dev/null)
        if [ -n "$BACKUP_AGE" ]; then
            echo "✅ OK ($BACKUP_COUNT backups, latest < 24h old)"
        else
            echo "⚠️  WARNING ($BACKUP_COUNT backups, no recent backup)"
        fi
    else
        echo "⚠️  WARNING (No backups found)"
    fi
else
    echo "⚠️  WARNING - backup directory not found"
fi

echo ""
echo "=========================================="

if [ $FAILURES -eq 0 ]; then
    echo "✅ All critical health checks passed!"
    exit 0
else
    echo "❌ $FAILURES critical health check(s) failed!"
    exit 1
fi
