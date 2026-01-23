# API Testing Guide - We Care Saathi Backend

## Quick Setup

### 1. Import Postman Collection

**File:** `We-Care-Saathi-API.postman_collection.json`

**Steps:**

1. Open Postman
2. Click "Import" button
3. Select the JSON file
4. Collection will be imported with all endpoints

---

## Testing Without Firebase (Mock Mode)

Since Firebase is not configured yet, here's how to test the API:

### Option 1: Direct Database Testing

1. **Create a test user directly in database:**

```bash
npm run prisma:seed
```

This creates:

- **Citizen**: Phone `+919876543210`
- **Officer**: Phone `+919876543220`, Badge `BP1001`
- **Admin**: Phone `+919876543230`

2. **Test endpoints that don't require auth:**

```bash
# Health check
GET http://localhost:5000/api/v1/health
```

---

### Option 2: Mock JWT for Testing

For now, you can test endpoints by temporarily modifying the auth middleware. I'll create a test script:

```bash
# Test health endpoint
curl http://localhost:5000/api/v1/health

# Expected response:
{
  "success": true,
  "message": "We Care - Saathi Backend is running",
  "timestamp": "2026-01-13T...",
  "uptime": 123.456
}
```

---

## Testing Flow (When Firebase is Configured)

### 1. **Login** (Citizen)

```
POST /api/v1/auth/login
Body: { "firebaseToken": "YOUR_FIREBASE_TOKEN" }
```

Response saves `accessToken` and `refreshToken` automatically.

### 2. **Create SOS** (Citizen)

```
POST /api/v1/sos/create
Headers: Authorization: Bearer {{accessToken}}
Body: {
  "latitude": 20.2961,
  "longitude": 85.8245,
  "accuracy": 10,
  "description": "Emergency at home"
}
```

### 3. **View Case** (Officer/Admin)

```
GET /api/v1/sos/:caseId
Headers: Authorization: Bearer {{accessToken}}
```

### 4. **Update Status** (Officer)

```
POST /api/v1/officer/case/:caseId/status
Headers: Authorization: Bearer {{accessToken}}
Body: {
  "status": "ACKNOWLEDGED",
  "notes": "On my way"
}
```

**Valid Status Progression:**

```
CREATED → ASSIGNED → ACKNOWLEDGED → EN_ROUTE → ON_SCENE → ACTION_TAKEN → CLOSED
```

---

## Testing Endpoints NOW (No Auth Required)

### Health Check ✅

```bash
curl http://localhost:5000/api/v1/health
```

### Root Endpoint ✅

```bash
curl http://localhost:5000
```

**Expected Response:**

```json
{
  "success": true,
  "message": "We Care - Saathi SOS Emergency Response API",
  "version": "1.0.0",
  "docs": "/api-docs",
  "health": "/api/v1/health"
}
```

---

## Database Inspection

### View Created Tables

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio
```

Opens at: http://localhost:5555

You can see:

- All tables (Users, SosCases, Officers, etc.)
- Test data from seed
- Live data as you test APIs

---

## Rate Limiting Testing

The API has rate limits:

- **Global**: 100 requests / 15 minutes
- **Login**: 5 attempts / minute
- **SOS Creation**: 3 per hour per user

Test rate limiting:

```bash
# Send 101 requests quickly - the 101st will be rate-limited
for i in {1..101}; do curl http://localhost:5000/api/v1/health; done
```

---

## Status Code Reference

| Code | Meaning                          |
| ---- | -------------------------------- |
| 200  | Success                          |
| 201  | Created (e.g., SOS created)      |
| 400  | Bad Request (validation error)   |
| 401  | Unauthorized (no/invalid token)  |
| 403  | Forbidden (wrong role)           |
| 404  | Not Found                        |
| 429  | Too Many Requests (rate limited) |
| 500  | Server Error                     |

---

## Next Steps for Full Testing

1. **Set up Firebase Project**:

   - Create Firebase project at https://console.firebase.google.com
   - Enable Authentication
   - Get service account credentials
   - Update `.env` file

2. **Test Full Flow**:
   - Register users via Firebase
   - Login to get JWT
   - Test all CRUD operations
   - Test status transitions
   - Test role-based access

---

## Quick Test Script

```bash
# Save as test-api.sh
echo "Testing We Care API..."

echo "\n1. Health Check:"
curl -s http://localhost:5000/api/v1/health | json_pp

echo "\n2. Root Endpoint:"
curl -s http://localhost:5000 | json_pp

echo "\nAPI is running! ✅"
```

---

Need help with Firebase setup or want to test specific flows? Let me know!
