import cors from 'cors';
import express from 'express';
import { configureCloudinary } from './services/documentService.js';
import { errorHandler } from './errors/errorHandler.js';
import { bootstrapRouter } from './routes/bootstrap.js';
import { applicationsRouter } from './routes/applications.js';
import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';

export function createApp() {
  configureCloudinary();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/bootstrap', bootstrapRouter);
  app.use('/users', usersRouter);
  app.use('/applications', applicationsRouter);
  app.use(errorHandler);

  return app;
}
