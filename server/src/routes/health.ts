import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    message: dbOk
      ? 'GSP API is running.'
      : 'API is up but database is not connected. Start MongoDB with: pnpm docker:up',
  });
});
