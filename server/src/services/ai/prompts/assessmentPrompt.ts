import type { ApplicationSnapshot } from '../../../workflow/types.js';
import { REQUIRED_DOCUMENTS } from '../../../workflow/rules.js';

export function buildAssessmentPrompt(
  application: ApplicationSnapshot,
  stage: ApplicationSnapshot['stage']
): { system: string; user: string } {
  const uploaded = application.documents.map((d) => d.type);
  const missing = REQUIRED_DOCUMENTS.filter((t) => !uploaded.includes(t));

  return {
    system: `You are an advisory QA assistant for UK university admissions.
Output ONLY valid JSON matching this schema:
{
  "readinessScore": number (0-100),
  "missingDocuments": string[],
  "risks": string[],
  "recommendation": "proceed" | "review_carefully" | "hold",
  "summary": string
}
Do not make final admission decisions. Be concise.`,
    user: `Review this application at stage "${stage}".

Student: ${application.student.name} (${application.student.nationality})
Course: ${application.course.name} at ${application.course.university}
Intake: ${application.course.intake}

Required documents: ${REQUIRED_DOCUMENTS.join(', ')}
Uploaded documents: ${uploaded.join(', ') || 'none'}
Known missing: ${missing.join(', ') || 'none'}

Evaluate document completeness and flag risks. Return JSON only.`,
  };
}
