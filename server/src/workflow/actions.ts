import type { ActionDefinition, ContextualAction, Stage } from './types.js';

export const ACTION_DEFINITIONS: Record<ContextualAction, ActionDefinition> = {
  defer: {
    id: 'defer',
    label: 'Defer',
    allowedStages: [
      'new_app',
      'qa_review',
      'app_review',
      'decision',
      'deposit',
      'cas_review',
    ],
    allowedRoles: ['counsellor', 'admission_officer'],
    sideEffects: ['setDeferred'],
    auditType: 'ACTION_DEFER',
  },
  withdraw: {
    id: 'withdraw',
    label: 'Withdraw',
    allowedStages: ['new_app', 'qa_review', 'app_review', 'decision'],
    allowedRoles: ['counsellor', 'agent'],
    targetStage: 'closed_lost',
    sideEffects: ['setClosedReason:withdraw'],
    auditType: 'ACTION_WITHDRAW',
  },
  cancel: {
    id: 'cancel',
    label: 'Cancel',
    allowedStages: ['new_app', 'qa_review', 'app_review', 'decision', 'deposit'],
    allowedRoles: ['counsellor', 'admission_officer'],
    targetStage: 'closed_lost',
    sideEffects: ['setClosedReason:cancel'],
    auditType: 'ACTION_CANCEL',
  },
  refund: {
    id: 'refund',
    label: 'Refund',
    allowedStages: ['deposit', 'cas_review'],
    allowedRoles: ['admission_officer'],
    targetStage: 'closed_lost',
    sideEffects: ['setClosedReason:refund', 'setRefundFlag'],
    auditType: 'ACTION_REFUND',
  },
  change_course: {
    id: 'change_course',
    label: 'Change Course',
    allowedStages: ['qa_review', 'app_review'],
    allowedRoles: ['counsellor', 'admission_officer'],
    sideEffects: ['invalidateAiAssessments'],
    auditType: 'ACTION_CHANGE_COURSE',
  },
  drop_out: {
    id: 'drop_out',
    label: 'Drop Out',
    allowedStages: ['enrolment'],
    allowedRoles: ['admission_officer'],
    targetStage: 'closed_lost',
    sideEffects: ['setClosedReason:drop_out'],
    auditType: 'ACTION_DROP_OUT',
  },
  app_rejected: {
    id: 'app_rejected',
    label: 'Reject Application',
    allowedStages: ['qa_review', 'app_review'],
    allowedRoles: ['qa_officer', 'admission_officer'],
    targetStage: 'app_rejected',
    sideEffects: ['setRejectionStage'],
    auditType: 'ACTION_APP_REJECTED',
  },
};

export function getActionDefinition(action: ContextualAction): ActionDefinition {
  return ACTION_DEFINITIONS[action];
}

export function isActionAllowedAtStage(
  action: ContextualAction,
  stage: Stage
): boolean {
  return ACTION_DEFINITIONS[action].allowedStages.includes(stage);
}

export function listAllActions(): ActionDefinition[] {
  return Object.values(ACTION_DEFINITIONS);
}
