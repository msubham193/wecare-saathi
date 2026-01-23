# 🔥 Quick Start - Test API Without Firebase

## Immediate Testing (No Firebase Setup Required!)

I've created a **test endpoint** so you can test the API immediately without Firebase.

### Step 1: Get Test Token

**Endpoint:** `POST /api/v1/test/test-login`

```bash
# Citizen Login
curl -X POST http://localhost:5000/api/v1/test/test-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "role": "CITIZEN"}'

# Officer Login
curl -X POST http://localhost:5000/api/v1/test/test-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543220", "role": "OFFICER"}'

# Admin Login
curl -X POST http://localhost:5000/api/v1/test/test-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543230", "role": "ADMIN"}'
```

**Response:**

```json
{
  "success": true,
  "message": "Test login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "phone": "+919876543210",
      "name": "Test User (CITIZEN)",
      "role": "CITIZEN"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### Step 2: Copy the Access Token

Copy the `accessToken` from the response.

### Step 3: Use in Postman

1. In Postman collection variables, set:
   - `accessToken` = the token you copied
2. Now all authenticated endpoints will work!

---

## Test Full SOS Flow

### 1. Login as Citizen

```bash
curl -X POST http://localhost:5000/api/v1/test/test-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "role": "CITIZEN"}'
```

Copy the `accessToken`.

### 2. Create SOS

```bash
curl -X POST http://localhost:5000/api/v1/sos/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "latitude": 20.2961,
    "longitude": 85.8245,
    "accuracy": 10,
    "description": "Test emergency"
  }'
```

### 3. Login as Officer

```bash
curl -X POST http://localhost:5000/api/v1/test/test-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543220", "role": "OFFICER"}'
```

### 4. View Cases (Officer)

```bash
curl -X GET "http://localhost:5000/api/v1/sos/officer/cases" \
  -H "Authorization: Bearer OFFICER_ACCESS_TOKEN_HERE"
```

---

## Postman Quick Setup

1. **Add Test Login Request:**

```
POST http://localhost:5000/api/v1/test/test-login

Body (JSON):
{
  "phone": "+919876543210",
  "role": "CITIZEN"
}
```

2. **Add Test Script to Auto-Save Token:**

In Postman, go to "Tests" tab and add:

```javascript
if (pm.response.code === 200) {
  const response = pm.response.json();
  pm.collectionVariables.set("accessToken", response.data.tokens.accessToken);
  pm.collectionVariables.set("refreshToken", response.data.tokens.refreshToken);
}
```

3. Now all endpoints will use the token automatically!

---

## ⚠️ Important Notes

- **This is for DEVELOPMENT ONLY**
- The test endpoint is **disabled in production**
- Delete `test.routes.ts` before deploying
- For production, use real Firebase authentication

---

## Option 2: Set Up Real Firebase (For Production)

If you want to set up real Firebase authentication:

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Enter project name: "We Care Saathi"
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Phone" sign-in method
4. Configure phone numbers for testing

### 3. Get Service Account Credentials

1. Go to Project Settings (gear icon)
2. Click "Service accounts"
3. Click "Generate new private key"
4. Download the JSON file

### 4. Update `.env`

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### 5. Test with Firebase SDK

You'd need a mobile app or web app to generate Firebase tokens for users.

---

**For now, use the test endpoint to start testing immediately!** 🚀

The server will automatically reload with the new test route.
