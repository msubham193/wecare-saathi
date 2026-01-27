// API Response status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// User roles
export const USER_ROLES = {
  CITIZEN: 'CITIZEN',
  OFFICER: 'OFFICER',
  ADMIN: 'ADMIN',
} as const;

// Case statuses
export const CASE_STATUS = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  EN_ROUTE: 'EN_ROUTE',
  ON_SCENE: 'ON_SCENE',
  ACTION_TAKEN: 'ACTION_TAKEN',
  CLOSED: 'CLOSED',
} as const;

// Valid status transitions (state machine)
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['ASSIGNED'],
  ASSIGNED: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['EN_ROUTE'],
  EN_ROUTE: ['ON_SCENE'],
  ON_SCENE: ['ACTION_TAKEN'],
  ACTION_TAKEN: ['CLOSED'],
  CLOSED: [], // No transitions from CLOSED
};

// Officer statuses
export const OFFICER_STATUS = {
  AVAILABLE: 'AVAILABLE',
  ON_DUTY: 'ON_DUTY',
  BUSY: 'BUSY',
  OFF_DUTY: 'OFF_DUTY',
} as const;

// Notification templates
export const NOTIFICATION_TEMPLATES = {
  SOS_CREATED_GUARDIAN: 'SOS_CREATED_GUARDIAN',
  CASE_ASSIGNED_OFFICER: 'CASE_ASSIGNED_OFFICER',
  STATUS_UPDATE_CITIZEN: 'STATUS_UPDATE_CITIZEN',
  CASE_CLOSED_CITIZEN: 'CASE_CLOSED_CITIZEN',
  OFFICER_REASSIGNED: 'OFFICER_REASSIGNED',
} as const;

// Notification messages
export const NOTIFICATION_MESSAGES = {
  SOS_CREATED_GUARDIAN: (name: string, caseNumber: string, location: string) =>
    `URGENT: Your ward ${name} has triggered an SOS. Case: ${caseNumber}. Location: ${location}. Police have been notified.`,
  
  CASE_ASSIGNED_OFFICER: (caseNumber: string) =>
    `New SOS case assigned: ${caseNumber}. Please acknowledge and navigate to location immediately.`,
  
  STATUS_UPDATE_CITIZEN: (caseNumber: string, status: string) =>
    `Your SOS case ${caseNumber} status updated to: ${status}. Officers are responding.`,
  
  CASE_CLOSED_CITIZEN: (caseNumber: string) =>
    `Your SOS case ${caseNumber} has been closed. Thank you for using We Care - Saathi.`,
  
  OFFICER_REASSIGNED: (caseNumber: string) =>
    `Case ${caseNumber} has been reassigned to another officer.`,
};

// Rate limit keys
export const RATE_LIMIT_KEYS = {
  SOS_CREATION: (userId: string) => `ratelimit:sos:${userId}`,
  LOGIN_ATTEMPT: (ip: string) => `ratelimit:login:${ip}`,
  GLOBAL: (ip: string) => `ratelimit:global:${ip}`,
} as const;

// Redis cache keys
export const CACHE_KEYS = {
  USER_SESSION: (userId: string) => `session:user:${userId}`,
  BLACKLISTED_TOKEN: (token: string) => `blacklist:token:${token}`,
  OFFICER_LOCATION: (officerId: string) => `location:officer:${officerId}`,
  CASE_DATA: (caseId: string) => `cache:case:${caseId}`,
} as const;

// Audit actions
export const AUDIT_ACTIONS = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  SOS_CREATED: 'SOS_CREATED',
  SOS_ASSIGNED: 'SOS_ASSIGNED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  EVIDENCE_UPLOADED: 'EVIDENCE_UPLOADED',
  CASE_CLOSED: 'CASE_CLOSED',
  OFFICER_REASSIGNED: 'OFFICER_REASSIGNED',
  REPORT_GENERATED: 'REPORT_GENERATED',
} as const;

// File upload constraints
export const FILE_UPLOAD = {
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'video/quicktime'],
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_CASE: 5,
} as const;

// Default values
export const DEFAULTS = {
  CASE_PRIORITY: 1,
  MAX_ASSIGNMENT_DISTANCE_KM: 10,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Case number generator
// Use timestamp + random components to ensure uniqueness across server restarts
export const generateCaseNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000); // 4 digit random
  
  return `SOS-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
};

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  INVALID_INPUT: 'Invalid input data',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later',
  SOS_SPAM_DETECTED: 'Too many SOS requests. Please wait before creating another',
  NO_OFFICERS_AVAILABLE: 'No officers available within range',
  DUPLICATE_GUARDIAN: 'Guardian with this phone number already exists',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed',
  INVALID_FILE_TYPE: 'File type not allowed',
  MAX_FILES_EXCEEDED: 'Maximum number of files per case exceeded',
} as const;
