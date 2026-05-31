import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { User } from '../models/User.js';
import type { AuthContext, Role } from '../workflow/types.js';

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

export async function loadUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.header('X-User-Id');
  if (!userId) {
    next(
      new AppError('USER_NOT_FOUND', {
        hint: 'Create a user with POST /users and pass the returned id in the X-User-Id header.',
      })
    );
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    next(new AppError('USER_NOT_FOUND'));
    return;
  }

  req.auth = {
    userId: user._id.toString(),
    role: user.role as Role,
    agentId: user.agentId ?? (user.role === 'agent' ? user._id.toString() : undefined),
    name: user.name,
  };
  next();
}

export function optionalLoadUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const userId = req.header('X-User-Id');
  if (!userId) {
    next();
    return;
  }
  loadUser(req, _res, next).catch(next);
}
