import { z } from 'zod';
import { CaseStatus } from '@prisma/client';

export const createSOSSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  description: z.string().max(500).optional(),
  videoDuration: z.number().positive().max(10).optional(), // Max 10 seconds
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(CaseStatus),
  notes: z.string().max(1000).optional(),
});

export const assignOfficerSchema = z.object({
  officerId: z.string().uuid(),
});

export const caseQuerySchema = z.object({
  status: z.nativeEnum(CaseStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateSOSRequest = z.infer<typeof createSOSSchema>;
export type UpdateStatusRequest = z.infer<typeof updateStatusSchema>;
export type AssignOfficerRequest = z.infer<typeof assignOfficerSchema>;
export type CaseQueryRequest = z.infer<typeof caseQuerySchema>;
