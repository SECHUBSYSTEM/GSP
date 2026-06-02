import './loadEnv.js';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/gsp'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  EXPOSE_ERROR_HINTS: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => {
      if (v === undefined) return true;
      if (typeof v === 'boolean') return v;
      return v !== 'false' && v !== '0';
    }),
  AI_PROVIDER: z.enum(['mock', 'gemini', 'openai']).default('mock'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
  );
}

export function logStartupConfig(): void {
  if (env.AI_PROVIDER === 'mock') {
    console.log('[GSP] AI provider: mock');
    return;
  }
  if (env.AI_PROVIDER === 'gemini') {
    const ok = Boolean(env.GEMINI_API_KEY?.trim());
    console.log(
      `[GSP] AI provider: gemini (${ok ? `model ${env.GEMINI_MODEL}` : 'WARNING — GEMINI_API_KEY missing, will fall back to mock'})`
    );
    return;
  }
  const ok = Boolean(env.OPENAI_API_KEY?.trim());
  console.log(
    `[GSP] AI provider: openai (${ok ? `model ${env.OPENAI_MODEL}` : 'WARNING — OPENAI_API_KEY missing, will fall back to mock'})`
  );
}
