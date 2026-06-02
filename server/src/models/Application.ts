import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ALL_STAGES, DOCUMENT_TYPES, ROLES } from '../workflow/types.js';

const documentSchema = new Schema(
  {
    type: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const noteSchema = new Schema(
  {
    text: { type: String, required: true },
    authorId: { type: String, required: true },
    authorRole: { type: String, enum: ROLES, required: true },
    createdAt: { type: Date, default: Date.now },
    isReviewNote: { type: Boolean, default: false },
  },
  { _id: false }
);

const aiAssessmentSchema = new Schema(
  {
    provider: { type: String, required: true },
    model: { type: String, required: true },
    stage: { type: String, enum: ALL_STAGES, required: true },
    readinessScore: { type: Number, required: true },
    missingDocuments: [{ type: String }],
    risks: [{ type: String }],
    recommendation: {
      type: String,
      enum: ['proceed', 'review_carefully', 'hold'],
      required: true,
    },
    summary: { type: String, required: true },
    advisory: { type: Boolean, default: true },
    generatedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['complete', 'failed', 'timeout', 'fallback'], required: true },
  },
  { _id: false }
);

const applicationSchema = new Schema(
  {
    schemaVersion: { type: Number, default: 1 },
    stage: { type: String, enum: ALL_STAGES, default: 'new_app' },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['active', 'deferred'], default: 'active' },
    transitionsPaused: { type: Boolean, default: false },
    closedReason: { type: String },
    refundFlag: { type: Boolean, default: false },
    rejectionStage: { type: String, enum: ALL_STAGES },
    student: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      nationality: { type: String, default: '' },
    },
    course: {
      name: { type: String, required: true },
      university: { type: String, required: true },
      intake: { type: String, default: '' },
    },
    agentId: { type: String, required: true },
    counsellorId: { type: String },
    documents: [documentSchema],
    notes: [noteSchema],
    aiAssessments: [aiAssessmentSchema],
  },
  { timestamps: true }
);

export type IApplication = HydratedDocument<InferSchemaType<typeof applicationSchema>>;

export const Application = mongoose.model('Application', applicationSchema);

export { DOCUMENT_TYPES };
