import { describe, expect, it } from 'vitest';
import { getActionDefinition } from '../../server/src/workflow/actions.js';
import { canPerformAction, canTransition, getAvailableActions } from '../../server/src/workflow/index.js';
import type { ApplicationSnapshot, AuthContext } from '../../server/src/workflow/types.js';

const baseApp = (): ApplicationSnapshot => ({
  schemaVersion: 1,
  stage: 'qa_review',
  version: 1,
  status: 'active',
  transitionsPaused: false,
  student: { name: 'Test', email: 't@example.com', nationality: 'UK' },
  course: { name: 'CS', university: 'UCL', intake: '2026' },
  agentId: 'agent-1',
  documents: [],
  notes: [],
  aiAssessments: [],
});

const qaAuth: AuthContext = { userId: 'u1', role: 'qa_officer', name: 'QA' };
const admissionAuth: AuthContext = { userId: 'u2', role: 'admission_officer', name: 'Admission' };
const agentAuth: AuthContext = { userId: 'agent-1', role: 'agent', agentId: 'agent-1', name: 'Agent' };

describe('workflow transitions', () => {
  it('blocks QA to App Review without required documents', () => {
    const result = canTransition(baseApp(), 'app_review', qaAuth);
    expect(result.allowed).toBe(false);
    expect(result.rule).toBe('allRequiredDocumentsUploaded');
  });

  it('allows QA to App Review when documents complete', () => {
    const app = baseApp();
    app.documents = [
      { type: 'passport', url: 'a', uploadedBy: 'x', uploadedAt: new Date() },
      { type: 'transcript', url: 'b', uploadedBy: 'x', uploadedAt: new Date() },
      { type: 'english_test', url: 'c', uploadedBy: 'x', uploadedAt: new Date() },
    ];
    const result = canTransition(app, 'app_review', qaAuth);
    expect(result.allowed).toBe(true);
  });

  it('blocks App Review to Decision without review note', () => {
    const app = baseApp();
    app.stage = 'app_review';
    const result = canTransition(app, 'decision', admissionAuth);
    expect(result.allowed).toBe(false);
    expect(result.rule).toBe('admissionReviewNoteExists');
  });

  it('allows idempotent same-stage check', () => {
    const app = baseApp();
    const result = canTransition(app, 'qa_review', qaAuth);
    expect(result.allowed).toBe(true);
  });

  it('blocks agent from internal transitions', () => {
    const app = baseApp();
    app.stage = 'new_app';
    const result = canTransition(app, 'qa_review', agentAuth);
    expect(result.allowed).toBe(false);
  });
});

describe('contextual actions', () => {
  it('drop_out moves to closed_lost stage via definition', () => {
    const def = getActionDefinition('drop_out');
    expect(def.targetStage).toBe('closed_lost');
    expect(def.allowedStages).toContain('enrolment');
  });

  it('app_rejected only from qa_review and app_review', () => {
    const def = getActionDefinition('app_rejected');
    expect(def.targetStage).toBe('app_rejected');
    expect(def.allowedStages).toEqual(['qa_review', 'app_review']);
  });

  it('refund only post-deposit', () => {
    const def = getActionDefinition('refund');
    expect(def.allowedStages).toEqual(['deposit', 'cas_review']);
  });

  it('agent only sees withdraw action', () => {
    const app = baseApp();
    app.stage = 'new_app';
    const actions = getAvailableActions(app, agentAuth);
    expect(actions.map((a) => a.action)).toEqual(['withdraw']);
  });

  it('blocks withdraw for wrong agent', () => {
    const app = baseApp();
    app.agentId = 'other-agent';
    const result = canPerformAction(app, 'withdraw', agentAuth);
    expect(result.allowed).toBe(false);
  });
});

describe('terminal states', () => {
  it('blocks transitions from closed_lost', () => {
    const app = baseApp();
    app.stage = 'closed_lost';
    const result = canTransition(app, 'app_review', qaAuth);
    expect(result.allowed).toBe(false);
  });
});
