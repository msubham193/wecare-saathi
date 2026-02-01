import { config } from "./index";

/**
 * Swagger/OpenAPI 3.0 Configuration
 * API Documentation for We Care - Saathi SOS Emergency Response System
 */
export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "We Care - Saathi SOS Emergency Response API",
    version: "1.0.0",
    description: `
# SOS Emergency Response Backend

Official API documentation for the **We Care - Saathi** SOS Emergency Response System developed for Commissionerate Police Bhubaneswar-Cuttack.

## Features

- 🚨 **Real-time SOS Creation & Management**
- 👮 **Officer Assignment & Tracking**
- 📍 **Geolocation-based Dispatch**
- 🔔 **Push Notification System**
- 🔐 **Firebase & Google OAuth Authentication**
- 📊 **Case Status Tracking**
- 🎯 **Role-based Access Control (RBAC)**

## Authentication

This API supports **two authentication methods**:

### 1. Firebase Authentication
1. Obtain a Firebase authentication token
2. Include it in the Authorization header: \`Bearer <token>\`
3. Use the \`/auth/login\` endpoint with your Firebase token

### 2. Google OAuth 2.0
1. Redirect users to \`/auth/google\` to initiate OAuth flow
2. After Google authentication, user is redirected to frontend with tokens
3. If \`requiresProfileCompletion\` is true, prompt user to complete profile via \`/auth/profile/complete\`
4. Use the JWT access token for subsequent API calls

### Protected Endpoints
Include the JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

- Global: 100 requests per 15 minutes
- Login: 5 requests per 15 minutes
- SOS Creation: 10 requests per 15 minutes

## Roles

- **CITIZEN**: Can create SOS requests and view own cases
- **OFFICER**: Can view assigned cases and update statuses
- **ADMIN**: Full access to all cases and officer management
    `,
    contact: {
      name: "We Care - Saathi Team",
      email: "support@wecareemergency.com",
    },
    license: {
      name: "ISC",
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: "Development server",
    },
    {
      url: "http://51.20.126.19/api/v1",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Health check and system status endpoints",
    },
    {
      name: "Authentication",
      description: "User authentication and token management",
    },
    {
      name: "SOS - Citizen",
      description: "Citizen SOS creation and case management",
    },
    {
      name: "SOS - Officer",
      description: "Officer case assignment and status updates",
    },
    {
      name: "SOS - Admin",
      description: "Admin case management and officer assignment",
    },
    {
      name: "Officers",
      description: "Officer profile and location management",
    },
    {
      name: "Test",
      description: "Development-only test endpoints",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Firebase JWT token obtained after authentication",
      },
    },
    schemas: {
      // ========== Standard Responses ==========
      SuccessResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          message: {
            type: "string",
            example: "Operation completed successfully",
          },
          data: {
            type: "object",
            description: "Response data (varies by endpoint)",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            example: "An error occurred",
          },
          error: {
            type: "string",
            example: "Detailed error message",
          },
        },
      },
      ValidationErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            example: "Validation failed",
          },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  example: "email",
                },
                message: {
                  type: "string",
                  example: "Invalid email format",
                },
              },
            },
          },
        },
      },

      // ========== User Models ==========
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          phoneNumber: {
            type: "string",
            example: "+919876543210",
          },
          role: {
            type: "string",
            enum: ["CITIZEN", "OFFICER", "ADMIN"],
            example: "CITIZEN",
          },
          displayName: {
            type: "string",
            example: "John Doe",
          },
          photoURL: {
            type: "string",
            nullable: true,
            example: "https://example.com/photo.jpg",
          },
          isActive: {
            type: "boolean",
            example: true,
          },
          emailVerified: {
            type: "boolean",
            example: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },

      // ========== Auth Models ==========
      LoginRequest: {
        type: "object",
        required: ["firebaseToken"],
        properties: {
          firebaseToken: {
            type: "string",
            description: "Firebase authentication token",
            example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          message: {
            type: "string",
            example: "Login successful",
          },
          data: {
            type: "object",
            properties: {
              user: {
                $ref: "#/components/schemas/User",
              },
              accessToken: {
                type: "string",
                description: "JWT access token",
              },
              refreshToken: {
                type: "string",
                description: "JWT refresh token",
              },
            },
          },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: {
            type: "string",
            description: "Refresh token obtained during login",
          },
        },
      },
      CompleteProfileRequest: {
        type: "object",
        required: ["age"],
        properties: {
          name: {
            type: "string",
            minLength: 2,
            maxLength: 100,
            example: "John Doe",
            description: "User full name (optional if already set via Google)",
          },
          age: {
            type: "integer",
            minimum: 1,
            maximum: 120,
            example: 30,
            description: "User age (required)",
          },
          address: {
            type: "string",
            minLength: 5,
            maxLength: 500,
            example: "123 Main Street, Bhubaneswar",
            description: "Residential address",
          },
          bloodGroup: {
            type: "string",
            maxLength: 10,
            example: "O+",
            description: "Blood group",
          },
          medicalInfo: {
            type: "string",
            maxLength: 1000,
            example: "Allergic to penicillin",
            description: "Medical conditions or allergies",
          },
          emergencyNote: {
            type: "string",
            maxLength: 500,
            example: "Contact family in case of emergency",
            description: "Emergency contact instructions",
          },
        },
      },
      GoogleAuthResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid",
              },
              name: {
                type: "string",
                example: "John Doe",
              },
              email: {
                type: "string",
                format: "email",
                example: "john@gmail.com",
              },
              avatar: {
                type: "string",
                nullable: true,
                example: "https://lh3.googleusercontent.com/...",
              },
              role: {
                type: "string",
                enum: ["CITIZEN", "OFFICER", "ADMIN"],
              },
              profileCompleted: {
                type: "boolean",
                example: false,
                description:
                  "Whether user has completed additional profile information",
              },
            },
          },
          tokens: {
            type: "object",
            properties: {
              accessToken: {
                type: "string",
                description: "JWT access token",
              },
              refreshToken: {
                type: "string",
                description: "JWT refresh token",
              },
            },
          },
          requiresProfileCompletion: {
            type: "boolean",
            example: true,
            description: "Indicates if user needs to complete their profile",
          },
        },
      },

      // ========== SOS Models ==========
      SOSCase: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          userId: {
            type: "string",
            format: "uuid",
          },
          latitude: {
            type: "number",
            format: "double",
            example: 20.2961,
          },
          longitude: {
            type: "number",
            format: "double",
            example: 85.8245,
          },
          locationAddress: {
            type: "string",
            example: "Bhubaneswar, Odisha",
          },
          emergencyType: {
            type: "string",
            enum: ["MEDICAL", "CRIME", "FIRE", "ACCIDENT", "OTHER"],
            example: "CRIME",
          },
          description: {
            type: "string",
            nullable: true,
            example: "Need immediate help",
          },
          status: {
            type: "string",
            enum: [
              "ACTIVE",
              "ASSIGNED",
              "IN_PROGRESS",
              "RESOLVED",
              "CANCELLED",
            ],
            example: "ACTIVE",
          },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            example: "HIGH",
          },
          assignedOfficerId: {
            type: "string",
            format: "uuid",
            nullable: true,
          },
          audioUrl: {
            type: "string",
            nullable: true,
          },
          videoUrl: {
            type: "string",
            nullable: true,
          },
          photoUrls: {
            type: "array",
            items: {
              type: "string",
            },
          },
          responseTime: {
            type: "integer",
            nullable: true,
            description: "Response time in seconds",
          },
          resolutionTime: {
            type: "integer",
            nullable: true,
            description: "Resolution time in seconds",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      CreateSOSRequest: {
        type: "object",
        required: ["latitude", "longitude", "emergencyType"],
        properties: {
          latitude: {
            type: "number",
            format: "double",
            minimum: -90,
            maximum: 90,
            example: 20.2961,
          },
          longitude: {
            type: "number",
            format: "double",
            minimum: -180,
            maximum: 180,
            example: 85.8245,
          },
          locationAddress: {
            type: "string",
            example: "Bhubaneswar, Odisha",
          },
          emergencyType: {
            type: "string",
            enum: ["MEDICAL", "CRIME", "FIRE", "ACCIDENT", "OTHER"],
            example: "CRIME",
          },
          description: {
            type: "string",
            maxLength: 500,
            example: "Need immediate help",
          },
          audioUrl: {
            type: "string",
          },
          videoUrl: {
            type: "string",
          },
          photoUrls: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
      UpdateStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"],
          },
          notes: {
            type: "string",
            maxLength: 500,
          },
        },
      },
      AssignOfficerRequest: {
        type: "object",
        required: ["officerId"],
        properties: {
          officerId: {
            type: "string",
            format: "uuid",
          },
        },
      },

      // ========== Officer Models ==========
      Officer: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          userId: {
            type: "string",
            format: "uuid",
          },
          badgeNumber: {
            type: "string",
            example: "BP12345",
          },
          rank: {
            type: "string",
            example: "Inspector",
          },
          division: {
            type: "string",
            example: "Central Division",
          },
          isOnDuty: {
            type: "boolean",
            example: true,
          },
          currentLatitude: {
            type: "number",
            format: "double",
            nullable: true,
          },
          currentLongitude: {
            type: "number",
            format: "double",
            nullable: true,
          },
          lastLocationUpdate: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
      UpdateLocationRequest: {
        type: "object",
        required: ["latitude", "longitude"],
        properties: {
          latitude: {
            type: "number",
            format: "double",
            minimum: -90,
            maximum: 90,
          },
          longitude: {
            type: "number",
            format: "double",
            minimum: -180,
            maximum: 180,
          },
          accuracy: {
            type: "number",
            description: "Location accuracy in meters",
          },
          caseId: {
            type: "string",
            format: "uuid",
            description: "Associated case ID if on active duty",
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication token is missing or invalid",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              message: "Unauthorized",
              error: "Invalid or expired token",
            },
          },
        },
      },
      ForbiddenError: {
        description: "User does not have required permissions",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              message: "Forbidden",
              error: "Insufficient permissions",
            },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              message: "Not Found",
              error: "Resource does not exist",
            },
          },
        },
      },
      ValidationError: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ValidationErrorResponse",
            },
          },
        },
      },
      RateLimitError: {
        description: "Too many requests",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              message: "Too Many Requests",
              error: "Rate limit exceeded. Please try again later.",
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check endpoint",
        description: "Check if the API is running and get system status",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "We Care - Saathi Backend is running",
                    },
                    timestamp: {
                      type: "string",
                      format: "date-time",
                    },
                    uptime: {
                      type: "number",
                      description: "Server uptime in seconds",
                      example: 3600,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ========== AUTH ENDPOINTS ==========
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login with Firebase token",
        description:
          "Authenticate user with Firebase token and receive access & refresh tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "429": {
            $ref: "#/components/responses/RateLimitError",
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        description: "Get a new access token using refresh token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RefreshTokenRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Token refreshed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Token refreshed successfully",
                    },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: {
                          type: "string",
                        },
                        refreshToken: {
                          type: "string",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout user",
        description: "Invalidate current access token",
        security: [
          {
            BearerAuth: [],
          },
        ],
        responses: {
          "200": {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Logged out successfully",
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user profile",
        description: "Retrieve authenticated user information",
        security: [
          {
            BearerAuth: [],
          },
        ],
        responses: {
          "200": {
            description: "User profile retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
        },
      },
    },
    "/auth/google": {
      get: {
        tags: ["Authentication"],
        summary: "Initiate Google OAuth login",
        description: `
Redirects the user to Google's OAuth consent screen to authenticate with their Google account.

**Flow:**
1. User clicks "Sign in with Google" on frontend
2. Frontend redirects to this endpoint
3. User authenticates with Google
4. Google redirects back to /auth/google/callback
5. User is redirected to frontend with tokens

**Note:** This endpoint initiates a browser redirect flow and cannot be tested directly via Swagger.
        `,
        responses: {
          "302": {
            description: "Redirects to Google OAuth consent screen",
          },
        },
      },
    },
    "/auth/google/callback": {
      get: {
        tags: ["Authentication"],
        summary: "Google OAuth callback",
        description: `
Handles the OAuth callback from Google after successful authentication.

This endpoint:
1. Receives the authorization code from Google
2. Exchanges it for user profile information
3. Creates or updates the user in database
4. Generates JWT access and refresh tokens
5. **Returns a JSON response with the tokens** (No redirect)

**Response Format:**
\`\`\`json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    },
    "requiresProfileCompletion": true
  }
\`\`\`
        `,
        parameters: [
          {
            name: "code",
            in: "query",
            description: "Authorization code from Google OAuth",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Authentication successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GoogleAuthResponse",
                },
              },
            },
          },
          "401": {
            description: "Google authentication failed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/auth/profile/complete": {
      post: {
        tags: ["Authentication"],
        summary: "Complete user profile after Google OAuth",
        description: `
After signing in with Google, users must complete their profile with additional information.

**Required Information:**
- Age (required)
- Address (optional)
- Blood Group (optional)
- Medical Information (optional)
- Emergency Notes (optional)

**When to call this endpoint:**
- Check the \`requiresProfileCompletion\` flag in the Google OAuth callback response
- If \`true\`, prompt the user to fill out this form
- Submit the data to this endpoint with the access token

**After completion:**
- User's \`profileCompleted\` flag will be set to \`true\`
- Citizen profile will be created/updated
- User can access full application features
        `,
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CompleteProfileRequest",
              },
              examples: {
                basic: {
                  summary: "Basic profile completion",
                  value: {
                    age: 30,
                    address: "123 Main Street, Bhubaneswar, Odisha",
                  },
                },
                complete: {
                  summary: "Complete profile with all fields",
                  value: {
                    name: "John Doe",
                    age: 30,
                    address: "123 Main Street, Bhubaneswar, Odisha 751001",
                    bloodGroup: "O+",
                    medicalInfo: "Allergic to penicillin, Diabetic",
                    emergencyNote: "Contact wife at +91-9876543210",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile completed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Profile completed successfully",
                    },
                    data: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                        },
                        name: {
                          type: "string",
                        },
                        email: {
                          type: "string",
                        },
                        avatar: {
                          type: "string",
                          nullable: true,
                        },
                        age: {
                          type: "integer",
                        },
                        role: {
                          type: "string",
                          enum: ["CITIZEN", "OFFICER", "ADMIN"],
                        },
                        profileCompleted: {
                          type: "boolean",
                          example: true,
                        },
                        hasProfile: {
                          type: "boolean",
                          example: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
        },
      },
    },

    // ========== ADMIN AUTHENTICATION ==========
    "/auth/admin/login": {
      post: {
        tags: ["Authentication"],
        summary: "Admin login with Email and Password",
        description: "Login endpoint for system administrators.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "admin@police.gov.in",
                  },
                  password: { type: "string", example: "Admin@123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string" },
                        refreshToken: { type: "string" },
                        user: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            role: { type: "string", example: "ADMIN" },
                            department: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },

    // ========== OFFICER AUTHENTICATION ==========
    "/auth/officer/login": {
      post: {
        tags: ["Authentication"],
        summary: "Officer login with Officer ID and Password",
        description:
          "Login endpoint for police officers. Officers use generated Officer ID (e.g., OF2026001) and password.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["officerId", "password"],
                properties: {
                  officerId: { type: "string", example: "OF2026001" },
                  password: { type: "string", example: "MySecureP@ss123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string" },
                        refreshToken: { type: "string" },
                        user: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            officerId: { type: "string", example: "OF2026001" },
                            mustChangePassword: {
                              type: "boolean",
                              example: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },

    "/auth/officer/change-password": {
      post: {
        tags: ["Authentication"],
        summary: "Change officer password",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password changed successfully" },
          "400": { description: "Validation error" },
        },
      },
    },

    "/auth/officer/forgot-password": {
      post: {
        tags: ["Authentication"],
        summary: "Request password reset",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["officerId", "email"],
                properties: {
                  officerId: { type: "string", example: "OF2026001" },
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password reset link sent" },
        },
      },
    },

    "/auth/officer/reset-password": {
      post: {
        tags: ["Authentication"],
        summary: "Reset password using token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resetToken", "newPassword"],
                properties: {
                  resetToken: { type: "string" },
                  newPassword: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password reset successfully" },
        },
      },
    },

    "/officers/register": {
      post: {
        tags: ["Officers"],
        summary: "Submit officer registration request",
        description:
          "Officers register themselves. Admin reviews and approves/rejects.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "name",
                  "email",
                  "phone",
                  "badgeNumber",
                  "designation",
                  "station",
                  "department",
                ],
                properties: {
                  name: { type: "string", example: "Officer Raj Kumar" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string", example: "+919876543210" },
                  badgeNumber: { type: "string", example: "PCB-2024-001" },
                  designation: { type: "string", example: "Sub-Inspector" },
                  station: {
                    type: "string",
                    example: "Khandagiri Police Station",
                  },
                  department: { type: "string", example: "Law & Order" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Registration submitted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        requestId: { type: "string" },
                        status: { type: "string", example: "PENDING" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/officers/admin/requests": {
      get: {
        tags: ["Officers"],
        summary: "List registration requests (Admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
            },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
        ],
        responses: {
          "200": { description: "List of requests" },
        },
      },
    },

    "/officers/admin/approve/{id}": {
      post: {
        tags: ["Officers"],
        summary: "Approve registration (Admin only)",
        description: "Approve and auto-generate Officer ID + password.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Officer account created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        officerId: { type: "string", example: "OF2026001" },
                        temporaryPassword: {
                          type: "string",
                          example: "TempP@ss123",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/officers/admin/reject/{id}": {
      post: {
        tags: ["Officers"],
        summary: "Reject registration (Admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: {
                  reason: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Request rejected" },
        },
      },
    },

    // ========== SOS CITIZEN ENDPOINTS ==========
    "/sos/create": {
      post: {
        tags: ["SOS - Citizen"],
        summary: "Create new SOS case",
        description: "Create a new emergency SOS request (Citizen only)",
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateSOSRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "SOS case created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "SOS case created successfully",
                    },
                    data: {
                      $ref: "#/components/schemas/SOSCase",
                    },
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
          "429": {
            $ref: "#/components/responses/RateLimitError",
          },
        },
      },
    },
    "/sos/citizen/cases": {
      get: {
        tags: ["SOS - Citizen"],
        summary: "Get citizen SOS cases",
        description:
          "Retrieve all SOS cases created by the authenticated citizen",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "ACTIVE",
                "ASSIGNED",
                "IN_PROGRESS",
                "RESOLVED",
                "CANCELLED",
              ],
            },
            description: "Filter by case status",
          },
          {
            name: "page",
            in: "query",
            schema: {
              type: "integer",
              default: 1,
            },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 10,
            },
            description: "Items per page",
          },
        ],
        responses: {
          "200": {
            description: "Cases retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "object",
                      properties: {
                        cases: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/SOSCase",
                          },
                        },
                        pagination: {
                          type: "object",
                          properties: {
                            page: {
                              type: "integer",
                            },
                            limit: {
                              type: "integer",
                            },
                            total: {
                              type: "integer",
                            },
                            totalPages: {
                              type: "integer",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
        },
      },
    },
    "/sos/{id}": {
      get: {
        tags: ["SOS - Citizen"],
        summary: "Get SOS case details",
        description: "Retrieve detailed information about a specific SOS case",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
            description: "SOS case ID",
          },
        ],
        responses: {
          "200": {
            description: "Case details retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      $ref: "#/components/schemas/SOSCase",
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
        },
      },
    },
    "/sos/{id}/status": {
      get: {
        tags: ["SOS - Citizen"],
        summary: "Get case status history",
        description: "Retrieve status change history for a case",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
            description: "SOS case ID",
          },
        ],
        responses: {
          "200": {
            description: "Status history retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          status: {
                            type: "string",
                          },
                          changedBy: {
                            type: "string",
                          },
                          notes: {
                            type: "string",
                          },
                          timestamp: {
                            type: "string",
                            format: "date-time",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
        },
      },
    },

    // ========== SOS OFFICER ENDPOINTS ==========
    "/sos/officer/cases": {
      get: {
        tags: ["SOS - Officer"],
        summary: "Get officer assigned cases",
        description: "Retrieve all cases assigned to the authenticated officer",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["ASSIGNED", "IN_PROGRESS", "RESOLVED"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Cases retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/SOSCase",
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
        },
      },
    },
    "/sos/officer/case/{id}/status": {
      post: {
        tags: ["SOS - Officer"],
        summary: "Update case status",
        description: "Update the status of an assigned case (Officer only)",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateStatusRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Status updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
        },
      },
    },

    // ========== SOS ADMIN ENDPOINTS ==========
    "/sos/admin/cases": {
      get: {
        tags: ["SOS - Admin"],
        summary: "Get all cases",
        description:
          "Retrieve all SOS cases with filtering options (Admin only)",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
            },
          },
          {
            name: "emergencyType",
            in: "query",
            schema: {
              type: "string",
            },
          },
          {
            name: "priority",
            in: "query",
            schema: {
              type: "string",
            },
          },
          {
            name: "page",
            in: "query",
            schema: {
              type: "integer",
              default: 1,
            },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 20,
            },
          },
        ],
        responses: {
          "200": {
            description: "Cases retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "object",
                      properties: {
                        cases: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/SOSCase",
                          },
                        },
                        pagination: {
                          type: "object",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
        },
      },
    },
    "/sos/admin/case/{id}/assign": {
      post: {
        tags: ["SOS - Admin"],
        summary: "Assign officer to case",
        description: "Manually assign an officer to a case (Admin only)",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AssignOfficerRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Officer assigned successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
        },
      },
    },
    "/sos/admin/case/{id}/status": {
      post: {
        tags: ["SOS - Admin"],
        summary: "Admin update case status",
        description: "Force update case status (Admin only)",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateStatusRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Status updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse",
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
        },
      },
    },

    // ========== OFFICER ENDPOINTS ==========
    "/officer/location": {
      post: {
        tags: ["Officers"],
        summary: "Update officer location",
        description: "Update current GPS location (Officer only)",
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateLocationRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Location updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
        },
      },
    },
    "/officer/profile": {
      get: {
        tags: ["Officers"],
        summary: "Get officer profile",
        description: "Retrieve authenticated officer profile",
        security: [
          {
            BearerAuth: [],
          },
        ],
        responses: {
          "200": {
            description: "Profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      $ref: "#/components/schemas/Officer",
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
        },
      },
    },
    "/officer/admin/officers": {
      get: {
        tags: ["Officers"],
        summary: "Get all officers",
        description: "Retrieve all officers (Admin only)",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "onDuty",
            in: "query",
            schema: {
              type: "boolean",
            },
            description: "Filter by duty status",
          },
        ],
        responses: {
          "200": {
            description: "Officers retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Officer",
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
        },
      },
    },
    "/officer/admin/officers/active-locations": {
      get: {
        tags: ["Officers"],
        summary: "Get active officer locations",
        description:
          "Retrieve real-time locations of on-duty officers (Admin only)",
        security: [
          {
            BearerAuth: [],
          },
        ],
        responses: {
          "200": {
            description: "Locations retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          officerId: {
                            type: "string",
                            format: "uuid",
                          },
                          badgeNumber: {
                            type: "string",
                          },
                          latitude: {
                            type: "number",
                          },
                          longitude: {
                            type: "number",
                          },
                          lastUpdate: {
                            type: "string",
                            format: "date-time",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "403": {
            $ref: "#/components/responses/ForbiddenError",
          },
        },
      },
    },
  },
};

export const swaggerOptions = {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "We Care - Saathi API Docs",
};
