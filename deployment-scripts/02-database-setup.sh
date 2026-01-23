#!/bin/bash
# Database Setup Script

set -e

echo "📦 Setting up PostgreSQL database..."

# Set variables
DB_NAME="we_care_db"
DB_USER="wecare_admin"
DB_PASSWORD="$(openssl rand -base64 32)"

echo "Creating database and user..."

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOF

# Configure PostgreSQL for local connections
echo "Configuring PostgreSQL..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/15/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql

# Save credentials to file
CREDS_FILE="$HOME/db-credentials.txt"
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}" > "$CREDS_FILE"
chmod 600 "$CREDS_FILE"

echo ""
echo "✅ Database setup completed successfully!"
echo "📝 Database credentials saved to: $CREDS_FILE"
echo ""
echo "Database details:"
echo "  Name: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo "  Host: localhost"
echo "  Port: 5432"
echo ""
echo "⚠️  IMPORTANT: Keep the credentials file secure!"
echo "📝 Next step: Run ./03-redis-setup.sh"
