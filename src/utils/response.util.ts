import { Response } from 'express';
import { ApiResponse } from '../types';
import { HTTP_STATUS } from './constants';

export class ResponseUtil {
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data?: T, message?: string): Response {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors?: Array<{ field: string; message: string }>
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static badRequest(
    res: Response,
    message: string,
    errors?: Array<{ field: string; message: string }>
  ): Response {
    return this.error(res, message, HTTP_STATUS.BAD_REQUEST, errors);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, HTTP_STATUS.UNAUTHORIZED);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, HTTP_STATUS.FORBIDDEN);
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.error(res, message, HTTP_STATUS.NOT_FOUND);
  }

  static conflict(res: Response, message: string): Response {
    return this.error(res, message, HTTP_STATUS.CONFLICT);
  }

  static tooManyRequests(res: Response, message: string = 'Too many requests'): Response {
    return this.error(res, message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }
}
