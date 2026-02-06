import { z } from 'zod';

export const createFeedbackSchema = z.object({
  text: z.string().min(1, 'Feedback text is required').max(2000, 'Feedback text must be under 2000 characters'),
  resolved: z.enum(['true', 'false']).transform(val => val === 'true'),
  rating: z.string().regex(/^[1-5]$/, 'Rating must be between 1 and 5').transform(Number).optional(),
});

export const caseIdParamSchema = z.object({
  caseId: z.string().uuid('Invalid case ID format'),
});

export const feedbackIdParamSchema = z.object({
  feedbackId: z.string().uuid('Invalid feedback ID format'),
});

export const createReplySchema = z.object({
  text: z.string().min(1, 'Reply text is required').max(2000, 'Reply text must be under 2000 characters'),
});

export const listFeedbacksQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  resolved: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  rating: z.string().regex(/^[1-5]$/).transform(Number).optional(),
});

export type CreateFeedbackRequest = z.infer<typeof createFeedbackSchema>;
export type CreateReplyRequest = z.infer<typeof createReplySchema>;
export type ListFeedbacksQuery = z.infer<typeof listFeedbacksQuerySchema>;
