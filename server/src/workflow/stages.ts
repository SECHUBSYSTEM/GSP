import type { PipelineStage, Stage } from './types.js';

export const STAGE_LABELS: Record<Stage, string> = {
  new_app: 'New App',
  qa_review: 'QA Review',
  app_review: 'App Review',
  decision: 'Decision',
  deposit: 'Deposit',
  cas_review: 'CAS Review',
  enrolment: 'Enrolment',
  app_rejected: 'App Rejected',
  closed_lost: 'Closed Lost',
};

export const PIPELINE_ORDER: PipelineStage[] = [
  'new_app',
  'qa_review',
  'app_review',
  'decision',
  'deposit',
  'cas_review',
  'enrolment',
];

export function isTerminalStage(stage: Stage): boolean {
  return stage === 'app_rejected' || stage === 'closed_lost';
}

export function getNextPipelineStage(stage: PipelineStage): PipelineStage | null {
  const index = PIPELINE_ORDER.indexOf(stage);
  if (index === -1 || index === PIPELINE_ORDER.length - 1) return null;
  return PIPELINE_ORDER[index + 1];
}

export function isPipelineStage(stage: Stage): stage is PipelineStage {
  return (PIPELINE_ORDER as readonly string[]).includes(stage);
}
