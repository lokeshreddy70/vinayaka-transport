import { Response } from 'express';
import { AppError } from './errors';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): Response => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data: data || null,
    timestamp: new Date().toISOString(),
  } as ApiResponse<T>);
};

export const sendError = (
  res: Response,
  error: Error | AppError,
  statusCode?: number
): Response => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      message: error.message,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(statusCode || 500).json({
    success: false,
    statusCode: statusCode || 500,
    message: 'Internal Server Error',
    error: error.message,
    timestamp: new Date().toISOString(),
  });
};
