# We Care – Saathi SOS Emergency Response Backend

Production-ready SOS Emergency Response Backend system for **Commissionerate Police Bhubaneswar-Cuttack**.

## 🚀 Features

- ✅ **Firebase + JWT Authentication** with role-based access control
- ✅ **SOS Case Management** with strict state machine (7 statuses)
- ✅ **Auto Officer Assignment** using distance calculation (Haversine formula)
- ✅ **Real-time Location Tracking** for officers
- ✅ **Multi-channel Notifications** (SMS, WhatsApp, FCM)
- ✅ **BullMQ Job Queues** with retry logic
- ✅ **Comprehensive Security** (Helmet, Rate Limiting, CORS)
- ✅ **Immutable Audit Logs** for government compliance
- ✅ **PostgreSQL Database** with Prisma ORM
- ✅ **Redis Caching** for sessions and rate limiting

---

## 📋 Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **Redis** >= 7.x
- **Firebase Project** (for authentication)
- **Google Maps API Key** (for geocoding)
- **AWS S3 or MinIO** (for evidence storage)

---

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd we-care-saathi-backend
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Strong secret for JWT tokens
- `FIREBASE_*` - Firebase Admin SDK credentials
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `SMS_*` / `WHATSAPP_*` - Notification provider credentials
- `S3_*` - Object storage credentials

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed test data
npm run prisma:seed
```

### 4. Start Services

```bash
# Start PostgreSQL (if not running)
# Start Redis (if not running)

# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

---

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication Endpoints

| Method | Endpoint        | Description                | Auth Required |
| ------ | --------------- | -------------------------- | ------------- |
| POST   | `/auth/login`   | Login with Firebase token  | No            |
| POST   | `/auth/refresh` | Refresh access token       | No            |
| POST   | `/auth/logout`  | Logout and blacklist token | Yes           |
| GET    | `/auth/me`      | Get current user profile   | Yes           |

### SOS Endpoints (CITIZEN)

| Method | Endpoint             | Description         | Auth Required |
| ------ | -------------------- | ------------------- | ------------- |
| POST   | `/sos/create`        | Create new SOS case | Yes (Citizen) |
| GET    | `/sos/:id`           | Get case details    | Yes           |
| GET    | `/sos/:id/status`    | Get status history  | Yes           |
| GET    | `/sos/citizen/cases` | Get citizen's cases | Yes (Citizen) |

### Officer Endpoints

| Method | Endpoint                   | Description         | Auth Required |
| ------ | -------------------------- | ------------------- | ------------- |
| GET    | `/officer/cases`           | Get assigned cases  | Yes (Officer) |
| POST   | `/officer/case/:id/status` | Update case status  | Yes (Officer) |
| POST   | `/officer/location`        | Update GPS location | Yes (Officer) |
| GET    | `/officer/profile`         | Get officer profile | Yes (Officer) |

### Admin Endpoints

| Method | Endpoint                           | Description                | Auth Required |
| ------ | ---------------------------------- | -------------------------- | ------------- |
| GET    | `/admin/cases`                     | Get all cases with filters | Yes (Admin)   |
| POST   | `/admin/case/:id/assign`           | Assign officer to case     | Yes (Admin)   |
| POST   | `/admin/case/:id/status`           | Force update case status   | Yes (Admin)   |
| GET    | `/admin/officers`                  | Get all officers           | Yes (Admin)   |
| GET    | `/admin/officers/active-locations` | Get officer locations      | Yes (Admin)   |

---

## 🔐 Security Features

1. **Helmet** - Security headers (CSP, HSTS, X-Frame-Options, etc.)
2. **CORS** - Configurable allowed origins
3. **Rate Limiting**:
   - Global: 100 requests / 15 minutes
   - Login: 5 attempts / minute
   - SOS Creation: 3 per hour (spam prevention)
4. **JWT Token Expiry**:
   - Access Token: 15 minutes
   - Refresh Token: 7 days
5. **Token Blacklisting** (Redis-based)
6. **Immutable Audit Logs**
7. **Input Validation** (Zod schemas)
8. **SQL Injection Prevention** (Prisma ORM)

---

## 🔄 SOS Case Status Flow

```
CREATED
   ↓
ASSIGNED (auto or manual)
   ↓
ACKNOWLEDGED (officer accepts)
   ↓
EN_ROUTE (officer en route)
   ↓
ON_SCENE (officer at location)
   ↓
ACTION_TAKEN (action completed)
   ↓
CLOSED (case resolved)
```

**Strict Rules:**

- No status skipping allowed
- Only assigned officer can update status
- Admin can force close at any stage
- All transitions logged in audit trail

---

## 📦 Project Structure

```
src/
├── config/           # Configuration files (DB, Redis, Firebase, Logger)
├── modules/          # Feature modules
│   ├── auth/         # Authentication (Firebase + JWT)
│   ├── sos/          # SOS case management
│   ├── officers/     # Officer management & location
│   └── notifications/# SMS, WhatsApp, FCM providers
├── middlewares/      # Auth, RBAC, Rate Limit, Validation, Error handling
├── queues/           # BullMQ workers (notifications)
├── routes/           # API route aggregation
├── utils/            # Helper functions (distance calc, response utils)
├── types/            # TypeScript type definitions
├── app.ts            # Express app configuration
└── server.ts         # Server entry point
```

---

## 🧪 Testing

### API Testing

1. **Health Check**:

   ```bash
   curl http://localhost:5000/api/v1/health
   ```

2. **Login (Citizen)**:

   ```bash
   curl -X POST http://localhost:5000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"firebaseToken": "YOUR_FIREBASE_TOKEN"}'
   ```

3. **Create SOS**:
   ```bash
   curl -X POST http://localhost:5000/api/v1/sos/create \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "latitude": 20.2961,
       "longitude": 85.8245,
       "accuracy": 10,
       "description": "Emergency at home"
     }'
   ```

---

## 🚨 Officer Assignment Logic

1. **Trigger**: On SOS case creation (status: CREATED)
2. **Search**: Find all officers with status = AVAILABLE
3. **Filter**: Officers with current GPS location within 10km radius (configurable)
4. **Sort**: By distance (nearest first)
5. **Assign**: Nearest officer, update status to ASSIGNED
6. **Notify**: Send FCM notification to officer + SMS to citizen

---

## 📊 Database Schema

**11 Core Models:**

- `User` - Base user table (citizen/officer/admin)
- `CitizenProfile` - Citizen-specific data
- `Guardian` - Emergency contacts
- `OfficerProfile` - Officer data (badge, station, location)
- `AdminProfile` - Admin metadata
- `SosCase` - SOS case records
- `CaseStatusLog` - Immutable status history
- `Evidence` - Case attachments (images/videos)
- `OfficerLocationLog` - GPS tracking history
- `Notification` - Notification records
- `AuditLog` - System audit trail

---

## 🔔 Notification System

### Providers

- **SMS** - Government-approved SMS gateway
- **WhatsApp** - WhatsApp Business API
- **FCM** - Firebase Cloud Messaging (Push notifications)

### Queue Strategy

- **BullMQ** with Redis backend
- **3 retry attempts** with exponential backoff (2s, 4s, 8s)
- **Fallback**: SMS → WhatsApp → Manual intervention
- **Logging**: All attempts logged in `notifications` table

---

## 🌍 Environment Variables Reference

| Variable                     | Description                          | Required |
| ---------------------------- | ------------------------------------ | -------- |
| `NODE_ENV`                   | Environment (development/production) | Yes      |
| `PORT`                       | Server port (default: 5000)          | No       |
| `DATABASE_URL`               | PostgreSQL connection string         | Yes      |
| `REDIS_URL`                  | Redis connection string              | Yes      |
| `JWT_SECRET`                 | JWT signing secret                   | Yes      |
| `FIREBASE_PROJECT_ID`        | Firebase project ID                  | Yes      |
| `FIREBASE_PRIVATE_KEY`       | Firebase private key                 | Yes      |
| `FIREBASE_CLIENT_EMAIL`      | Firebase client email                | Yes      |
| `GOOGLE_MAPS_API_KEY`        | Google Maps API key                  | No       |
| `SMS_PROVIDER_URL`           | SMS gateway URL                      | No       |
| `WHATSAPP_API_URL`           | WhatsApp API URL                     | No       |
| `S3_ENDPOINT`                | S3 endpoint                          | No       |
| `MAX_ASSIGNMENT_DISTANCE_KM` | Max officer distance (default: 10)   | No       |

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (min 32 characters)
- [ ] Enable HTTPS (terminate SSL at load balancer/nginx)
- [ ] Configure firewall rules (allow 5000 or custom port)
- [ ] Set up PostgreSQL backups
- [ ] Set up Redis persistence (AOF + RDB)
- [ ] Configure log aggregation (Winston → CloudWatch/ELK)
- [ ] Set up monitoring (Health checks, APM)
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Set up process manager (PM2 recommended)

### PM2 Deployment

```bash
npm install -g pm2
npm run build
pm2 start dist/server.js --name we-care-backend
pm2 save
pm2 startup
```

---

## 📝 License

**Proprietary** - Commissionerate Police Bhubaneswar-Cuttack

---

## 👥 Support

For technical support or configuration assistance, contact the development team.

---

## 🎯 Roadmap

- [ ] WebSocket implementation for real-time updates
- [ ] Reports & Analytics dashboard API
- [ ] Evidence upload with S3 integration
- [ ] Geofencing for automatic officer discovery
- [ ] ML-based officer assignment optimization
- [ ] Multi-language notification support
