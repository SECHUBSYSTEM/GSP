import type { ApplicationSnapshot } from '../../../workflow/types.js';
import { REQUIRED_DOCUMENTS } from '../../../workflow/rules.js';
import type { AiAssessmentResult, AiProvider } from '../types.js';

export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  async assess(
    application: ApplicationSnapshot,
    _stage: ApplicationSnapshot['stage']
  ): Promise<AiAssessmentResult> {
    const uploaded = new Set(application.documents.map((d) => d.type));
    const missing = REQUIRED_DOCUMENTS.filter((t) => !uploaded.has(t));
    const score = Math.max(0, 100 - missing.length * 25);

    return {
      readinessScore: score,
      missingDocuments: missing,
      risks:
        missing.length > 0
          ? [`Missing required documents: ${missing.join(', ')}`]
          : ['No major document gaps detected by automated check.'],
      recommendation:
        missing.length >= 2 ? 'hold' : missing.length === 1 ? 'review_carefully' : 'proceed',
      summary:
        missing.length > 0
          ? `Automated review found ${missing.length} missing document(s). Manual verification recommended.`
          : 'All required documents appear present. Proceed with manual QA review.',
    };
  }
}
