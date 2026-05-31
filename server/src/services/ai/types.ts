import { z } from 'zod';
import type { ApplicationSnapshot } from '../../workflow/types.js';

export const AiAssessmentResultSchema = z.object({
  readinessScore: z.number().min(0).max(100),
  missingDocuments: z.array(z.string()),
  risks: z.array(z.string()),
  recommendation: z.enum(['proceed', 'review_carefully', 'hold']),
  summary: z.string(),
});

export type AiAssessmentResult = z.infer<typeof AiAssessmentResultSchema>;

export interface AiProvider {
  readonly name: string;
  assess(
    application: ApplicationSnapshot,
    stage: ApplicationSnapshot['stage']
  ): Promise<AiAssessmentResult>;
}

export interface StoredAiAssessment extends AiAssessmentResult {
  provider: string;
  model: string;
  stage: ApplicationSnapshot['stage'];
  advisory: true;
  generatedAt: Date;
  status: 'complete' | 'failed' | 'timeout';
}
