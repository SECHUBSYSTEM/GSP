import { Router } from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import { AppError } from '../errors/AppError.js';
import { isCloudinaryConfigured } from '../config/env.js';
import type { AuthenticatedRequest } from '../middleware/loadUser.js';
import { loadUser } from '../middleware/loadUser.js';
import { requireAuth, requirePermission } from '../middleware/requirePermission.js';
import { AuditLog } from '../models/AuditLog.js';
import { toAgentView } from '../serializers/agentView.js';
import { toInternalView } from '../serializers/internalView.js';
import {
  createMockUploadUrl,
  uploadToCloudinary,
} from '../services/documentService.js';
import { workflowService } from '../services/workflowService.js';
import { paramId } from '../utils/paramId.js';
import { isInternalRole } from '../workflow/permissions.js';
import { ALL_STAGES, CONTEXTUAL_ACTIONS } from '../workflow/types.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const applicationsRouter = Router();

applicationsRouter.use(loadUser, requireAuth);

function validate(req: AuthenticatedRequest) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('VALIDATION_ERROR', { details: errors.array() });
  }
}

function serializeApp(app: Parameters<typeof toInternalView>[0], auth: NonNullable<AuthenticatedRequest['auth']>) {
  return isInternalRole(auth.role) ? toInternalView(app, auth) : toAgentView(app, auth);
}

applicationsRouter.post(
  '/',
  requirePermission('CREATE_APPLICATION'),
  body('student.name').isString().trim().notEmpty(),
  body('student.email').isEmail(),
  body('student.nationality').optional().isString(),
  body('course.name').isString().trim().notEmpty(),
  body('course.university').isString().trim().notEmpty(),
  body('course.intake').optional().isString(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const app = await workflowService.createApplication(req.body, req.auth!);
      res.status(201).json({ data: serializeApp(app, req.auth!), message: 'Application created successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.get(
  '/',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const apps = await workflowService.listApplications(req.auth!);
      res.json({
        data: apps.map((app) => serializeApp(app, req.auth!)),
      });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.get(
  '/:id',
  param('id').isMongoId(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const app = await workflowService.getApplicationOrThrow(paramId(req.params.id), req.auth!);
      res.json({ data: serializeApp(app, req.auth!) });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.post(
  '/:id/transition',
  requirePermission('TRANSITION'),
  param('id').isMongoId(),
  body('targetStage').isIn([...ALL_STAGES]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const id = paramId(req.params.id);
      const { app, noOp } = await workflowService.transition(
        id,
        req.body.targetStage,
        req.auth!
      );
      res.json({
        data: serializeApp(app, req.auth!),
        noOp,
        message: noOp
          ? 'Application is already at this stage.'
          : `Application moved to ${req.body.targetStage}.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.get(
  '/:id/available-transitions',
  requirePermission('TRANSITION'),
  param('id').isMongoId(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const app = await workflowService.getApplicationOrThrow(paramId(req.params.id), req.auth!);
      const availability = workflowService.getAvailability(app, req.auth!);
      res.json({ data: availability.transitions });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.get(
  '/:id/available-actions',
  param('id').isMongoId(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const app = await workflowService.getApplicationOrThrow(paramId(req.params.id), req.auth!);
      const availability = workflowService.getAvailability(app, req.auth!);
      res.json({ data: availability.allActions });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.post(
  '/:id/actions/:action',
  requirePermission('CONTEXTUAL_ACTION'),
  param('id').isMongoId(),
  param('action').isIn([...CONTEXTUAL_ACTIONS]),
  body('course').optional().isObject(),
  body('note').optional().isString(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const id = paramId(req.params.id);
      const app = await workflowService.performAction(
        id,
        req.params.action as (typeof CONTEXTUAL_ACTIONS)[number],
        req.auth!,
        { course: req.body.course, note: req.body.note }
      );
      res.json({
        data: serializeApp(app, req.auth!),
        message: `Action "${req.params.action}" completed. Pipeline updated automatically.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.post(
  '/:id/documents',
  requirePermission('UPLOAD_DOCUMENT'),
  param('id').isMongoId(),
  upload.single('file'),
  body('type').isString().notEmpty(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      if (!req.file) {
        throw new AppError('VALIDATION_ERROR', {
          message: 'A file is required.',
          hint: 'Attach a file using the "file" field in multipart form data.',
        });
      }

      let url: string;
      let publicId: string | undefined;

      const id = paramId(req.params.id);
      if (isCloudinaryConfigured()) {
        const uploaded = await uploadToCloudinary(
          req.file.buffer,
          req.file.originalname
        );
        url = uploaded.url;
        publicId = uploaded.publicId;
      } else {
        url = createMockUploadUrl(req.body.type, id);
      }

      const { app, replaced } = await workflowService.addDocument(
        id,
        { type: req.body.type, url, publicId },
        req.auth!
      );

      res.status(replaced ? 200 : 201).json({
        data: serializeApp(app, req.auth!),
        replaced,
        message: replaced
          ? `Previous ${req.body.type} document was replaced.`
          : `${req.body.type} document uploaded successfully.`,
        hint: !isCloudinaryConfigured()
          ? 'Cloudinary is not configured — a placeholder URL was stored. Add Cloudinary env vars for real uploads.'
          : undefined,
      });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.post(
  '/:id/notes',
  requirePermission('ADD_NOTE'),
  param('id').isMongoId(),
  body('text').isString().trim().notEmpty(),
  body('isReviewNote').optional().isBoolean(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const id = paramId(req.params.id);
      const isReviewNote =
        Boolean(req.body.isReviewNote) && req.auth!.role === 'admission_officer';
      const app = await workflowService.addNote(
        id,
        req.body.text,
        req.auth!,
        isReviewNote
      );
      res.status(201).json({
        data: serializeApp(app, req.auth!),
        message: isReviewNote ? 'Review note added.' : 'Note added.',
      });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.get(
  '/:id/ai-assessment',
  requirePermission('VIEW_AI_ASSESSMENT'),
  param('id').isMongoId(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const app = await workflowService.getApplicationOrThrow(paramId(req.params.id), req.auth!);
      const stage = app.stage;
      const latest = [...app.aiAssessments]
        .filter((a) => a.stage === stage)
        .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];

      res.json({
        data: latest ?? null,
        message: latest
          ? 'AI assessment is advisory — officer decision is required.'
          : 'No AI assessment yet for the current stage.',
      });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.post(
  '/:id/ai-assessment/refresh',
  requirePermission('VIEW_AI_ASSESSMENT'),
  param('id').isMongoId(),
  body('force').optional().isBoolean(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const app = await workflowService.refreshAiAssessment(
        paramId(req.params.id),
        req.auth!,
        Boolean(req.body.force)
      );
      res.json({
        data: serializeApp(app, req.auth!),
        message: 'AI assessment refreshed. Result is advisory only.',
      });
    } catch (err) {
      next(err);
    }
  }
);

applicationsRouter.get(
  '/:id/audit-log',
  requirePermission('VIEW_AUDIT_LOG'),
  param('id').isMongoId(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      validate(req);
      const id = paramId(req.params.id);
      await workflowService.getApplicationOrThrow(id, req.auth!);
      const logs = await AuditLog.find({ applicationId: id }).sort({
        createdAt: -1,
      });
      res.json({ data: logs });
    } catch (err) {
      next(err);
    }
  }
);
