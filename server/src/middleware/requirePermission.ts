import type { NextFunction, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { roleHasPermission, type Permission } from '../workflow/permissions.js';
import type { AuthenticatedRequest } from './loadUser.js';

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError('USER_NOT_FOUND'));
      return;
    }
    if (!roleHasPermission(req.auth.role, permission)) {
      next(
        new AppError('FORBIDDEN_ROLE', {
          hint: `This action requires permission: ${permission}. Create a user with an appropriate role.`,
        })
      );
      return;
    }
    next();
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.auth) {
    next(new AppError('USER_NOT_FOUND'));
    return;
  }
  next();
}
