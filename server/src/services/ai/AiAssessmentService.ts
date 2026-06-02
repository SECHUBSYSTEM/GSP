import { env } from '../../config/env.js';
import type { ApplicationSnapshot, Stage } from '../../workflow/types.js';
import { createAiProvider } from './providerFactory.js';
import { MockAiProvider } from './providers/mockProvider.js';
import type { StoredAiAssessment } from './types.js';
import { AiAssessmentResultSchema } from './types.js';

const TIMEOUT_MS = 20_000;
const DEBOUNCE_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('AI assessment timed out')), ms)
    ),
  ]);
}

function primaryModelName(providerName: string): string {
  if (providerName === 'gemini') return env.GEMINI_MODEL;
  if (providerName === 'openai') return env.OPENAI_MODEL;
  return 'mock';
}

export class AiAssessmentService {
  private readonly primary = createAiProvider();
  private readonly fallback = new MockAiProvider();

  async runAssessment(
    application: ApplicationSnapshot,
    stage: Stage,
    options?: { force?: boolean }
  ): Promise<{ assessment: StoredAiAssessment; cached: boolean }> {
    const latest = application.aiAssessments
      .filter((a) => a.stage === stage)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];

    if (
      !options?.force &&
      latest &&
      latest.status === 'complete' &&
      Date.now() - new Date(latest.generatedAt).getTime() < DEBOUNCE_MS
    ) {
      return { assessment: latest, cached: true };
    }

    try {
      const raw = await withTimeout(
        this.primary.assess(application, stage),
        TIMEOUT_MS
      );
      const validated = AiAssessmentResultSchema.parse(raw);
      return {
        cached: false,
        assessment: {
          ...validated,
          provider: this.primary.name,
          model: primaryModelName(this.primary.name),
          stage,
          advisory: true,
          generatedAt: new Date(),
          status: 'complete',
        },
      };
    } catch (firstError) {
      const reason =
        firstError instanceof Error ? firstError.message : 'Unknown provider error';

      if (env.AI_PROVIDER === 'mock') {
        return {
          cached: false,
          assessment: {
            readinessScore: 0,
            missingDocuments: [],
            risks: [reason],
            recommendation: 'review_carefully',
            summary: 'Mock AI assessment failed unexpectedly.',
            provider: 'mock',
            model: 'mock',
            stage,
            advisory: true,
            generatedAt: new Date(),
            status: firstError instanceof Error && firstError.message.includes('timed out')
              ? 'timeout'
              : 'failed',
          },
        };
      }

      console.warn(
        `[GSP] AI provider "${this.primary.name}" failed (${reason}). Using rule-based mock fallback.`
      );

      try {
        const raw = await withTimeout(
          this.fallback.assess(application, stage),
          TIMEOUT_MS
        );
        const validated = AiAssessmentResultSchema.parse(raw);
        return {
          cached: false,
          assessment: {
            ...validated,
            provider: 'mock',
            model: 'fallback',
            risks: [
              ...validated.risks,
              `${this.primary.name} unavailable (${reason}) — rule-based fallback shown`,
            ],
            summary: `${validated.summary} [Fallback: ${this.primary.name} failed.]`,
            stage,
            advisory: true,
            generatedAt: new Date(),
            status: 'fallback',
          },
        };
      } catch {
        return {
          cached: false,
          assessment: {
            readinessScore: 0,
            missingDocuments: [],
            risks: ['AI assessment unavailable', reason],
            recommendation: 'review_carefully',
            summary: 'Automated assessment could not be completed. Proceed with manual review.',
            provider: this.primary.name,
            model: 'n/a',
            stage,
            advisory: true,
            generatedAt: new Date(),
            status: firstError instanceof Error && firstError.message.includes('timed out')
              ? 'timeout'
              : 'failed',
          },
        };
      }
    }
  }
}

export const aiAssessmentService = new AiAssessmentService();
