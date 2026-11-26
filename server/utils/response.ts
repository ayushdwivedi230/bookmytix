import type { Response } from 'express';

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export const apiResponse = {
  success<T>(res: Response, data: T, statusCode = 200, message?: string) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  },

  error(res: Response, error: string, statusCode = 400, errors?: Record<string, string[]>) {
    return res.status(statusCode).json({
      error,
      ...(errors ? { errors } : {}),
    });
  },
};
