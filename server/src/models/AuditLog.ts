import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const auditLogSchema = new Schema(
  {
    applicationId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    type: { type: String, required: true },
    summary: { type: String, required: true },
    fromStage: { type: String },
    toStage: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export type IAuditLog = InferSchemaType<typeof auditLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export async function writeAuditLog(entry: {
  applicationId: string;
  actorId: string;
  actorRole: string;
  type: string;
  summary: string;
  fromStage?: string;
  toStage?: string;
  metadata?: unknown;
}): Promise<void> {
  await AuditLog.create(entry);
}
