import { Router } from 'express';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

/** Development-only helpers for the demo UI. Disabled in production. */
export const bootstrapRouter = Router();

bootstrapRouter.get('/users', async (_req, res, next) => {
  try {
    if (env.NODE_ENV === 'production') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
      return;
    }
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      data: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        agentId: u.agentId,
      })),
    });
  } catch (err) {
    next(err);
  }
});
