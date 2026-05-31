import type { ApplicationSnapshot, Stage } from './types.js';
import { DOCUMENT_TYPES } from './types.js';

export type RuleId =
  | 'basicFieldsComplete'
  | 'allRequiredDocumentsUploaded'
  | 'admissionReviewNoteExists'
  | 'notDeferred'
  | 'notTerminal';

export interface RuleResult {
  passed: boolean;
  rule: RuleId;
  reason: string;
  hint: string;
}

export const REQUIRED_DOCUMENTS = [...DOCUMENT_TYPES];

export const RULE_DEFINITIONS: Record<
  RuleId,
  (app: ApplicationSnapshot) => RuleResult
> = {
  notTerminal: (app) => ({
    passed: app.stage !== 'app_rejected' && app.stage !== 'closed_lost',
    rule: 'notTerminal',
    reason: 'This application is closed.',
    hint: 'No further actions are possible on closed applications.',
  }),

  notDeferred: (app) => ({
    passed: !app.transitionsPaused && app.status !== 'deferred',
    rule: 'notDeferred',
    reason: 'This application is deferred.',
    hint: 'Resume the application before making stage changes.',
  }),

  basicFieldsComplete: (app) => {
    const ok =
      Boolean(app.student.name?.trim()) &&
      Boolean(app.student.email?.trim()) &&
      Boolean(app.course.name?.trim()) &&
      Boolean(app.course.university?.trim());
    return {
      passed: ok,
      rule: 'basicFieldsComplete',
      reason: 'Required application fields are incomplete.',
      hint: 'Provide student name, email, course name, and university before progressing.',
    };
  },

  allRequiredDocumentsUploaded: (app) => {
    const uploaded = new Set(app.documents.map((d) => d.type));
    const missing = REQUIRED_DOCUMENTS.filter((t) => !uploaded.has(t));
    return {
      passed: missing.length === 0,
      rule: 'allRequiredDocumentsUploaded',
      reason: 'Required documents are missing.',
      hint:
        missing.length > 0
          ? `Upload all required documents first: ${missing.join(', ')}.`
          : 'Upload all required documents before moving to App Review.',
    };
  },

  admissionReviewNoteExists: (app) => {
    const hasReviewNote = app.notes.some(
      (n) => n.isReviewNote && n.authorRole === 'admission_officer'
    );
    return {
      passed: hasReviewNote,
      rule: 'admissionReviewNoteExists',
      reason: 'An admission review note is required.',
      hint: 'Add a review note as an Admission Officer before moving to Decision.',
    };
  },
};

/** Rules that must pass for a specific transition. */
export const TRANSITION_RULES: Record<string, RuleId[]> = {
  'new_app->qa_review': ['notTerminal', 'notDeferred', 'basicFieldsComplete'],
  'qa_review->app_review': ['notTerminal', 'notDeferred', 'allRequiredDocumentsUploaded'],
  'app_review->decision': ['notTerminal', 'notDeferred', 'admissionReviewNoteExists'],
};

export function getTransitionKey(from: Stage, to: Stage): string {
  return `${from}->${to}`;
}

export function evaluateRules(
  app: ApplicationSnapshot,
  ruleIds: RuleId[]
): RuleResult[] {
  return ruleIds.map((id) => RULE_DEFINITIONS[id](app));
}

export function firstFailedRule(
  results: RuleResult[]
): RuleResult | undefined {
  return results.find((r) => !r.passed);
}
