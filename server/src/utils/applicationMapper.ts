import type { IApplication } from '../models/Application.js';
import type { ApplicationSnapshot, AuthContext, Stage } from '../workflow/types.js';

export function toApplicationSnapshot(app: IApplication): ApplicationSnapshot {
  return {
    _id: app._id.toString(),
    schemaVersion: app.schemaVersion,
    stage: app.stage as Stage,
    version: app.version,
    status: app.status as 'active' | 'deferred',
    transitionsPaused: app.transitionsPaused,
    closedReason: app.closedReason ?? undefined,
    refundFlag: app.refundFlag ?? undefined,
    rejectionStage: app.rejectionStage as Stage | undefined,
    student: {
      name: app.student!.name,
      email: app.student!.email,
      nationality: app.student!.nationality ?? '',
    },
    course: {
      name: app.course!.name,
      university: app.course!.university,
      intake: app.course!.intake ?? '',
    },
    agentId: app.agentId,
    counsellorId: app.counsellorId ?? undefined,
    documents: app.documents.map((d) => ({
      type: d.type,
      url: d.url,
      publicId: d.publicId ?? undefined,
      uploadedBy: d.uploadedBy,
      uploadedAt: d.uploadedAt,
    })),
    notes: app.notes.map((n) => ({
      text: n.text,
      authorId: n.authorId,
      authorRole: n.authorRole as AuthContext['role'],
      createdAt: n.createdAt,
      isReviewNote: n.isReviewNote ?? false,
    })),
    aiAssessments: app.aiAssessments.map((a) => ({
      provider: a.provider,
      model: a.model,
      stage: a.stage as Stage,
      readinessScore: a.readinessScore,
      missingDocuments: a.missingDocuments ?? [],
      risks: a.risks ?? [],
      recommendation: a.recommendation as 'proceed' | 'review_carefully' | 'hold',
      summary: a.summary,
      advisory: true as const,
      generatedAt: a.generatedAt,
      status: a.status as 'complete' | 'failed' | 'timeout',
    })),
  };
}
