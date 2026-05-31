import type { AuthContext, Stage } from './types.js';

/** Forward transitions each role may trigger from a given stage. */
export const STAGE_TRANSITIONS: Record<
  Stage,
  Partial<Record<Stage, readonly AuthContext['role'][]>>
> = {
  new_app: {
    qa_review: ['counsellor', 'admission_officer'],
  },
  qa_review: {
    app_review: ['qa_officer'],
    app_rejected: ['qa_officer'],
  },
  app_review: {
    decision: ['admission_officer'],
    app_rejected: ['admission_officer'],
  },
  decision: {
    deposit: ['admission_officer'],
  },
  deposit: {
    cas_review: ['admission_officer'],
  },
  cas_review: {
    enrolment: ['admission_officer'],
  },
  enrolment: {},
  app_rejected: {},
  closed_lost: {},
};

export function getAllowedTargetStages(
  fromStage: Stage,
  role: AuthContext['role']
): Stage[] {
  const map = STAGE_TRANSITIONS[fromStage] ?? {};
  return Object.entries(map)
    .filter(([, roles]) => roles?.includes(role))
    .map(([target]) => target as Stage);
}

export function canRoleTransition(
  fromStage: Stage,
  toStage: Stage,
  role: AuthContext['role']
): boolean {
  const allowed = STAGE_TRANSITIONS[fromStage]?.[toStage];
  return Boolean(allowed?.includes(role));
}

export function isSequentialTransition(fromStage: Stage, toStage: Stage): boolean {
  const forwardMap = STAGE_TRANSITIONS[fromStage];
  if (!forwardMap) return false;
  return Object.prototype.hasOwnProperty.call(forwardMap, toStage);
}
