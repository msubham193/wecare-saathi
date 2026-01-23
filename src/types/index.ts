import { Request } from 'express';
import { CaseStatus } from '@prisma/client';

// Extended Express Request with user info
// User type is extended in types/express.d.ts
export interface AuthRequest extends Request {
  // user is already defined by Express.Request from passport
}


// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

// SOS Case types
export interface CreateSOSRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  description?: string;
}

export interface UpdateCaseStatusRequest {
  status: CaseStatus;
  notes?: string;
}

export interface AssignOfficerRequest {
  officerId: string;
}

// Location types
export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  caseId?: string;
}

export interface DistanceCalculation {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  distanceKm: number;
}

// Notification types
export interface NotificationPayload {
  recipient: string;
  type: 'sms' | 'whatsapp' | 'fcm';
  template: string;
  data: Record<string, any>;
  caseId?: string;
}

// Guardian types
export interface AddGuardianRequest {
  name: string;
  phone: string;
  relation: string;
  isPrimary?: boolean;
}

// Officer availability
export interface OfficerAvailability {
  id: string;
  name: string;
  badgeNumber: string;
  currentLat: number;
  currentLng: number;
  distanceKm: number;
  status: string;
}

// Report types
export interface ReportQuery {
  startDate?: Date;
  endDate?: Date;
  status?: CaseStatus;
  officerId?: string;
  period?: 'today' | 'week' | 'month' | 'year';
}

export interface DashboardMetrics {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  todayCases: number;
  statusBreakdown: Record<CaseStatus, number>;
}

// Evidence types
export interface UploadEvidenceRequest {
  caseId: string;
  latitude?: number;
  longitude?: number;
}

// Audit log types
export interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// WebSocket event types
export enum SocketEvent {
  SOS_CREATED = 'sos:created',
  SOS_ASSIGNED = 'sos:assigned',
  SOS_STATUS_CHANGED = 'sos:status-changed',
  OFFICER_LOCATION = 'officer:location',
  CASE_CLOSED = 'case:closed',
}

export interface SocketPayload {
  event: SocketEvent;
  data: any;
  timestamp: Date;
}
