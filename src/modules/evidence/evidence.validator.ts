import { z } from 'zod';

/**
 * Schema for uploading evidence
 */
export const UploadEvidenceSchema = z.object({
  caseId: z.string().uuid('Invalid case ID format'),
});

export type UploadEvidenceRequest = z.infer<typeof UploadEvidenceSchema>;

/**
 * Schema for getting evidence by case
 */
export const GetEvidenceByCaseSchema = z.object({
  caseId: z.string().uuid('Invalid case ID format'),
});

export type GetEvidenceByCaseRequest = z.infer<typeof GetEvidenceByCaseSchema>;
