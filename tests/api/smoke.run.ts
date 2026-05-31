/**
 * API smoke test — requires MongoDB at MONGODB_URI (run `pnpm docker:up` first).
 * Run via: pnpm --filter @gsp/server test:smoke
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from '../../server/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../server/src/config/database.js';
import { User } from '../../server/src/models/User.js';
import { Application } from '../../server/src/models/Application.js';
import type { Express } from 'express';

function request(app: Express, method: string, path: string, options?: {
  headers?: Record<string, string>;
  body?: unknown;
}) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const server = app.listen(0, async () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('No server address'));
        return;
      }
      const url = `http://127.0.0.1:${address.port}${path}`;
      try {
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(options?.headers ?? {}),
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
        });
        const body = (await res.json()) as Record<string, unknown>;
        server.close(() => resolve({ status: res.status, body }));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

async function main() {
  process.env.EXPOSE_ERROR_HINTS = 'true';
  process.env.AI_PROVIDER = 'mock';

  await connectDatabase();
  await User.deleteMany({ email: { $regex: /@smoke\.test$/ } });
  await Application.deleteMany({ 'student.email': { $regex: /@smoke\.test$/ } });

  const app = createApp();

  const counsellor = await User.create({
    name: 'Counsellor',
    email: 'c@smoke.test',
    role: 'counsellor',
  });
  const qa = await User.create({
    name: 'QA',
    email: 'qa@smoke.test',
    role: 'qa_officer',
  });

  const createRes = await request(app, 'POST', '/applications', {
    headers: { 'X-User-Id': counsellor._id.toString() },
    body: {
      student: { name: 'Jane', email: 'jane@smoke.test', nationality: 'UK' },
      course: { name: 'CS', university: 'Oxford', intake: '2026' },
    },
  });
  if (createRes.status !== 201) throw new Error(`Expected 201, got ${createRes.status}`);

  const appId = (createRes.body.data as { id: string }).id;

  const toQa = await request(app, 'POST', `/applications/${appId}/transition`, {
    headers: { 'X-User-Id': counsellor._id.toString() },
    body: { targetStage: 'qa_review' },
  });
  if (toQa.status !== 200) throw new Error(`Expected 200 transition, got ${toQa.status}`);

  const blocked = await request(app, 'POST', `/applications/${appId}/transition`, {
    headers: { 'X-User-Id': qa._id.toString() },
    body: { targetStage: 'app_review' },
  });
  if (blocked.status !== 422) throw new Error(`Expected 422 blocked, got ${blocked.status}`);
  const err = blocked.body.error as { code?: string; hint?: string };
  if (err.code !== 'TRANSITION_BLOCKED') throw new Error('Expected TRANSITION_BLOCKED');
  if (!err.hint) throw new Error('Expected hint in error response');

  await User.deleteMany({ email: { $regex: /@smoke\.test$/ } });
  await Application.deleteMany({ 'student.email': { $regex: /@smoke\.test$/ } });
  await disconnectDatabase();
  console.log('Smoke test passed.');
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message ?? err);
  console.error('Ensure MongoDB is running: pnpm docker:up');
  process.exit(1);
});
