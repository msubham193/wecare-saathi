# Redis & PostgreSQL Installation Guide for Windows

## Quick Setup for We Care - Saathi Backend

### Step 1: Install Redis (Memurai - Redis for Windows)

**Memurai** is the recommended Redis for Windows (fully compatible).

1. **Download Memurai:**

   - Visit: https://www.memurai.com/get-memurai
   - Click "Download Memurai" (free version)
   - Or direct link: https://www.memurai.com/get-memurai

2. **Install:**

   - Run the downloaded installer
   - Accept defaults
   - Installer will automatically start Memurai as a Windows Service

3. **Verify Installation:**

   ```powershell
   # Check if Memurai service is running
   Get-Service -Name Memurai*
   ```

   Should show "Running"

---

### Step 2: Install PostgreSQL

1. **Download PostgreSQL:**

   - Visit: https://www.postgresql.org/download/windows/
   - Click "Download the installer" (EnterpriseDB)
   - Choose version 14 or higher
   - Or direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Install PostgreSQL:**

   - Run installer
   - **Important settings:**
     - Password: Choose a strong password (remember it!)
     - Port: 5432 (default)
     - Locale: Default
   - Components: Select PostgreSQL Server, pgAdmin, Command Line Tools

3. **Create Database:**
   Open PowerShell and run:

   ```powershell
   # Set path (adjust version number if different)
   $env:Path += ";C:\Program Files\PostgreSQL\16\bin"

   # Create database
   createdb -U postgres we_care_db
   ```

   Enter password when prompted.

---

### Step 3: Update Backend Configuration

Once both are installed, update your `.env` file:

```env
# Replace with your actual PostgreSQL password
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/we_care_db

# Memurai runs on standard Redis port
REDIS_URL=redis://localhost:6379
```

---

### Step 4: Run Database Migrations

```bash
# Navigate to project
cd C:\Users\subha\Desktop\we-care-saathi-backend

# Generate Prisma client (already done, but just in case)
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate

# Optional: Load test data
npm run prisma:seed
```

---

### Step 5: Start the Server

```bash
npm run dev
```

You should see:

```
🚀 Server running on port 5000
Redis connected successfully
```

---

## Troubleshooting

### Redis/Memurai Issues

```powershell
# Start Memurai service
Start-Service Memurai

# Check status
Get-Service Memurai
```

### PostgreSQL Issues

```powershell
# Start PostgreSQL service
Start-Service postgresql-x64-16  # Adjust version number

# Check status
Get-Service postgresql*
```

### Database Connection Issues

- Verify password in `.env` matches what you set during PostgreSQL installation
- Ensure database `we_care_db` was created successfully
- Check PostgreSQL is running on port 5432

---

## Quick Test After Setup

1. **Health Check:**

   ```bash
   curl http://localhost:5000/api/v1/health
   ```

2. **Should return:**
   ```json
   {
     "success": true,
     "message": "We Care - Saathi Backend is running"
   }
   ```

---

## Download Links Summary

- **Memurai (Redis)**: https://www.memurai.com/get-memurai
- **PostgreSQL**: https://www.postgresql.org/download/windows/

Need help with any step? Let me know!
