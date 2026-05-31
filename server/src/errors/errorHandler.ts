import type { NextFunction, Request, Response } from 'express';
import { AppError } from './AppError.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json(err.toJSON());
    return;
  }

  console.error(err);
  const appErr = new AppError('INTERNAL_ERROR');
  res.status(appErr.httpStatus).json(appErr.toJSON());
}
