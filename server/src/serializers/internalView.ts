import type { IApplication } from '../models/Application.js';
import {
  getAvailableActions,
  getAvailableTransitions,
} from '../workflow/index.js';
import { STAGE_LABELS } from '../workflow/stages.js';
import type { AuthContext, Stage } from '../workflow/types.js';
import { toApplicationSnapshot } from '../utils/applicationMapper.js';

export function toInternalView(app: IApplication, auth: AuthContext) {
  const snapshot = toApplicationSnapshot(app);
  const stage = app.stage as Stage;

  const latestAssessment = [...app.aiAssessments]
    .filter((a) => a.stage === stage)
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];

  return {
    id: app._id.toString(),
    schemaVersion: app.schemaVersion,
    stage,
    stageLabel: STAGE_LABELS[stage],
    version: app.version,
    status: app.status,
    transitionsPaused: app.transitionsPaused,
    closedReason: app.closedReason,
    refundFlag: app.refundFlag,
    rejectionStage: app.rejectionStage,
    student: app.student,
    course: app.course,
    agentId: app.agentId,
    counsellorId: app.counsellorId,
    documents: app.documents,
    notes: app.notes,
    aiAssessment: latestAssessment ?? null,
    aiAssessments: app.aiAssessments,
    availableTransitions: getAvailableTransitions(snapshot, auth),
    availableActions: getAvailableActions(snapshot, auth),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}
