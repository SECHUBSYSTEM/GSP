import type { Stage } from './types.js';

/** Agent-safe status labels — never expose internal stage names. */
export const AGENT_STATUS_MAP: Record<Stage, string> = {
  new_app: 'Submitted',
  qa_review: 'Under Review',
  app_review: 'Under Review',
  decision: 'Decision Pending',
  deposit: 'Deposit Required',
  cas_review: 'CAS In Progress',
  enrolment: 'Enrolment In Progress',
  app_rejected: 'Not Proceeding',
  closed_lost: 'Closed',
};

export function toAgentStatusLabel(stage: Stage): string {
  return AGENT_STATUS_MAP[stage] ?? 'In Progress';
}

export function isInternalStageName(value: string): boolean {
  return Object.keys(AGENT_STATUS_MAP).includes(value);
}
