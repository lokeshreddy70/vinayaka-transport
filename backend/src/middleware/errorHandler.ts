import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../config/logger';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error({
    error: err,
    path: req.path,
    method: req.method,
  });

  sendError(res, err);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(
    res,
    new Error(`Cannot ${req.method} ${req.path}`),
    404
  );
};
