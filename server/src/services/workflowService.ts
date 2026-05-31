import {
  agentCanAccessApplication,
  canPerformAction,
  canTransition,
  getAvailableActions,
  getAvailableTransitions,
} from '../workflow/index.js';
import { getActionDefinition } from '../workflow/actions.js';
import { isTerminalStage } from '../workflow/stages.js';
import type {
  ApplicationSnapshot,
  AuthContext,
  ContextualAction,
  Stage,
} from '../workflow/types.js';
import { AppError } from '../errors/AppError.js';
import { Application, type IApplication } from '../models/Application.js';
import { writeAuditLog } from '../models/AuditLog.js';
import { toApplicationSnapshot } from '../utils/applicationMapper.js';
import { aiAssessmentService } from './ai/AiAssessmentService.js';

const REVIEW_STAGES: Stage[] = ['qa_review', 'app_review'];

async function triggerAiIfReviewStage(
  app: IApplication,
  stage: Stage
): Promise<IApplication> {
  if (!REVIEW_STAGES.includes(stage)) return app;

  const snapshot = toApplicationSnapshot(app);
  const { assessment } = await aiAssessmentService.runAssessment(snapshot, stage);
  app.aiAssessments.push(assessment);
  await app.save();
  await writeAuditLog({
    applicationId: app._id.toString(),
    actorId: 'system',
    actorRole: 'system',
    type: 'AI_ASSESSMENT',
    summary: `AI assessment generated for ${stage}`,
    metadata: { stage, status: assessment.status, score: assessment.readinessScore },
  });
  return app;
}

function applySideEffects(
  app: IApplication,
  sideEffects: string[],
  auth: AuthContext,
  fromStage: Stage
): void {
  for (const effect of sideEffects) {
    if (effect === 'setDeferred') {
      app.status = 'deferred';
      app.transitionsPaused = true;
    } else if (effect.startsWith('setClosedReason:')) {
      app.closedReason = effect.split(':')[1];
      app.status = 'active';
      app.transitionsPaused = false;
    } else if (effect === 'setRefundFlag') {
      app.refundFlag = true;
    } else if (effect === 'setRejectionStage') {
      app.rejectionStage = fromStage;
    } else if (effect === 'invalidateAiAssessments') {
      app.set('aiAssessments', []);
    }
  }
}

export class WorkflowService {
  async getApplicationOrThrow(
    id: string,
    auth: AuthContext
  ): Promise<IApplication> {
    const app = await Application.findById(id);
    if (!app) {
      throw new AppError('APPLICATION_NOT_FOUND');
    }
    const snapshot = toApplicationSnapshot(app);
    if (!agentCanAccessApplication(snapshot, auth)) {
      throw new AppError('AGENT_SCOPE');
    }
    return app;
  }

  async createApplication(
    data: {
      student: ApplicationSnapshot['student'];
      course: ApplicationSnapshot['course'];
    },
    auth: AuthContext
  ): Promise<IApplication> {
    const agentId =
      auth.role === 'agent' ? auth.agentId ?? auth.userId : auth.userId;

    const app = await Application.create({
      student: data.student,
      course: data.course,
      agentId,
      counsellorId: auth.role === 'counsellor' ? auth.userId : undefined,
    });

    await writeAuditLog({
      applicationId: app._id.toString(),
      actorId: auth.userId,
      actorRole: auth.role,
      type: 'APPLICATION_CREATED',
      summary: 'Application created',
      toStage: 'new_app',
    });

    return app;
  }

  async listApplications(auth: AuthContext): Promise<IApplication[]> {
    if (auth.role === 'agent') {
      const agentKey = auth.agentId ?? auth.userId;
      return Application.find({ agentId: agentKey }).sort({ updatedAt: -1 });
    }
    return Application.find().sort({ updatedAt: -1 });
  }

  async transition(
    id: string,
    targetStage: Stage,
    auth: AuthContext
  ): Promise<{ app: IApplication; noOp: boolean }> {
    const app = await this.getApplicationOrThrow(id, auth);
    const snapshot = toApplicationSnapshot(app);

    if (app.stage === targetStage) {
      return { app, noOp: true };
    }

    const result = canTransition(snapshot, targetStage, auth);
    if (!result.allowed) {
      throw new AppError(
        result.reason?.includes('skip') ? 'INVALID_TRANSITION' : 'TRANSITION_BLOCKED',
        { message: result.reason, hint: result.hint, rule: result.rule }
      );
    }

    const fromStage = app.stage as Stage;
    const updated = await Application.findOneAndUpdate(
      { _id: app._id, version: app.version },
      {
        $set: { stage: targetStage, status: 'active', transitionsPaused: false },
        $inc: { version: 1 },
      },
      { new: true }
    );

    if (!updated) {
      throw new AppError('STALE_VERSION');
    }

    await writeAuditLog({
      applicationId: updated._id.toString(),
      actorId: auth.userId,
      actorRole: auth.role,
      type: 'STAGE_TRANSITION',
      summary: `Transitioned from ${fromStage} to ${targetStage}`,
      fromStage,
      toStage: targetStage,
    });

    return { app: await triggerAiIfReviewStage(updated, targetStage), noOp: false };
  }

  async performAction(
    id: string,
    action: ContextualAction,
    auth: AuthContext,
    payload?: { course?: ApplicationSnapshot['course']; note?: string }
  ): Promise<IApplication> {
    const app = await this.getApplicationOrThrow(id, auth);
    const snapshot = toApplicationSnapshot(app);
    const def = getActionDefinition(action);

    const result = canPerformAction(snapshot, action, auth);
    if (!result.allowed) {
      throw new AppError('ACTION_BLOCKED', {
        message: result.reason,
        hint: result.hint,
      });
    }

    const fromStage = app.stage as Stage;

    if (action === 'change_course' && payload?.course) {
      app.course = payload.course;
    }

    applySideEffects(app, def.sideEffects, auth, fromStage);

    if (def.targetStage) {
      app.stage = def.targetStage;
    }

    app.version += 1;
    await app.save();

    await writeAuditLog({
      applicationId: app._id.toString(),
      actorId: auth.userId,
      actorRole: auth.role,
      type: def.auditType,
      summary: `${def.label} action performed`,
      fromStage,
      toStage: def.targetStage ?? fromStage,
      metadata: payload,
    });

    if (def.targetStage && REVIEW_STAGES.includes(def.targetStage)) {
      return triggerAiIfReviewStage(app, def.targetStage);
    }

    return app;
  }

  getAvailability(app: IApplication, auth: AuthContext) {
    const snapshot = toApplicationSnapshot(app);
    return {
      transitions: getAvailableTransitions(snapshot, auth),
      actions: getAvailableActions(snapshot, auth).filter((a) => !a.blocked),
      allActions: getAvailableActions(snapshot, auth),
    };
  }

  async addNote(
    id: string,
    text: string,
    auth: AuthContext,
    isReviewNote = false
  ): Promise<IApplication> {
    const app = await this.getApplicationOrThrow(id, auth);
    if (isTerminalStage(app.stage as Stage)) {
      throw new AppError('TERMINAL_STATE');
    }

    app.notes.push({
      text,
      authorId: auth.userId,
      authorRole: auth.role,
      createdAt: new Date(),
      isReviewNote,
    });
    app.version += 1;
    await app.save();

    await writeAuditLog({
      applicationId: app._id.toString(),
      actorId: auth.userId,
      actorRole: auth.role,
      type: isReviewNote ? 'REVIEW_NOTE_ADDED' : 'NOTE_ADDED',
      summary: isReviewNote ? 'Admission review note added' : 'Note added',
    });

    return app;
  }

  async addDocument(
    id: string,
    doc: { type: string; url: string; publicId?: string },
    auth: AuthContext
  ): Promise<{ app: IApplication; replaced: boolean }> {
    const app = await this.getApplicationOrThrow(id, auth);
    if (isTerminalStage(app.stage as Stage)) {
      throw new AppError('TERMINAL_STATE');
    }

    const existingIndex = app.documents.findIndex((d) => d.type === doc.type);
    const replaced = existingIndex >= 0;
    const entry = {
      type: doc.type,
      url: doc.url,
      publicId: doc.publicId,
      uploadedBy: auth.userId,
      uploadedAt: new Date(),
    };

    if (replaced) {
      app.documents.splice(existingIndex, 1);
    }
    app.documents.push(entry);

    app.version += 1;
    await app.save();

    await writeAuditLog({
      applicationId: app._id.toString(),
      actorId: auth.userId,
      actorRole: auth.role,
      type: 'DOCUMENT_UPLOADED',
      summary: `${replaced ? 'Replaced' : 'Uploaded'} document: ${doc.type}`,
      metadata: { type: doc.type, url: doc.url },
    });

    return { app, replaced };
  }

  async refreshAiAssessment(
    id: string,
    auth: AuthContext,
    force = false
  ): Promise<IApplication> {
    const app = await this.getApplicationOrThrow(id, auth);
    const stage = app.stage as Stage;
    if (!REVIEW_STAGES.includes(stage)) {
      throw new AppError('ACTION_BLOCKED', {
        message: 'AI assessment is only available at review stages.',
        hint: 'Move the application to QA Review or App Review first.',
      });
    }

    const snapshot = toApplicationSnapshot(app);
    const { assessment, cached } = await aiAssessmentService.runAssessment(
      snapshot,
      stage,
      { force }
    );

    if (!cached) {
      app.aiAssessments.push(assessment);
      app.version += 1;
      await app.save();
    }

    return app;
  }
}

export const workflowService = new WorkflowService();
