import { Response } from 'express';
import { FeedbackService } from './feedback.service';
import { AuthRequest } from '../../types';
import { ResponseUtil } from '../../utils/response.util';
import { asyncHandler } from '../../middlewares/error.middleware';

const feedbackService = new FeedbackService();

export class FeedbackController {
  /**
   * POST /feedback/:caseId
   * Citizen creates feedback for a closed case
   */
  createFeedback = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const { caseId } = req.params;
    const { text, resolved, rating } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const photoFile = files?.photo?.[0];
    const videoFile = files?.video?.[0];

    const feedback = await feedbackService.createFeedback(
      caseId,
      req.user.id,
      {
        text,
        resolved: resolved === 'true' || resolved === true,
        rating: rating ? Number(rating) : undefined,
      },
      photoFile,
      videoFile,
    );

    return ResponseUtil.created(res, feedback, 'Feedback submitted successfully');
  });

  /**
   * GET /feedback/:caseId
   * Get feedback for a specific case
   */
  getFeedbackByCase = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const feedback = await feedbackService.getFeedbackByCase(
      req.params.caseId,
      req.user.id,
      req.user.role,
    );

    return ResponseUtil.success(res, feedback);
  });

  /**
   * GET /feedback
   * Admin gets all feedbacks with pagination/filters
   */
  getAllFeedbacks = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await feedbackService.getAllFeedbacks({
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      resolved: req.query.resolved !== undefined
        ? req.query.resolved === 'true'
        : undefined,
      rating: req.query.rating ? Number(req.query.rating) : undefined,
    });

    return ResponseUtil.success(res, result);
  });

  /**
   * POST /feedback/:feedbackId/reply
   * Admin replies to feedback
   */
  createReply = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const reply = await feedbackService.createReply(
      req.params.feedbackId,
      req.user.id,
      req.body.text,
    );

    return ResponseUtil.created(res, reply, 'Reply submitted successfully');
  });

  /**
   * GET /feedback/:feedbackId/replies
   * Get replies for a feedback
   */
  getReplies = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    const replies = await feedbackService.getReplies(
      req.params.feedbackId,
      req.user.id,
      req.user.role,
    );

    return ResponseUtil.success(res, replies);
  });
}
