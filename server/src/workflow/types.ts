export const ROLES = [
  'agent',
  'counsellor',
  'qa_officer',
  'admission_officer',
] as const;

export type Role = (typeof ROLES)[number];

export const PIPELINE_STAGES = [
  'new_app',
  'qa_review',
  'app_review',
  'decision',
  'deposit',
  'cas_review',
  'enrolment',
] as const;

export const TERMINAL_STAGES = ['app_rejected', 'closed_lost'] as const;

export const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type TerminalStage = (typeof TERMINAL_STAGES)[number];
export type Stage = (typeof ALL_STAGES)[number];

export const CONTEXTUAL_ACTIONS = [
  'defer',
  'withdraw',
  'cancel',
  'refund',
  'change_course',
  'drop_out',
  'app_rejected',
] as const;

export type ContextualAction = (typeof CONTEXTUAL_ACTIONS)[number];

export const DOCUMENT_TYPES = ['passport', 'transcript', 'english_test'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface StudentInfo {
  name: string;
  email: string;
  nationality: string;
}

export interface CourseInfo {
  name: string;
  university: string;
  intake: string;
}

export interface ApplicationDocument {
  type: DocumentType | string;
  url: string;
  publicId?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ApplicationNote {
  text: string;
  authorId: string;
  authorRole: Role;
  createdAt: Date;
  isReviewNote?: boolean;
}

export interface AiAssessmentRecord {
  provider: string;
  model: string;
  stage: Stage;
  readinessScore: number;
  missingDocuments: string[];
  risks: string[];
  recommendation: 'proceed' | 'review_carefully' | 'hold';
  summary: string;
  advisory: true;
  generatedAt: Date;
  status: 'complete' | 'failed' | 'timeout';
}

export interface ApplicationSnapshot {
  _id?: string;
  schemaVersion: number;
  stage: Stage;
  version: number;
  status: 'active' | 'deferred';
  transitionsPaused: boolean;
  closedReason?: string;
  refundFlag?: boolean;
  rejectionStage?: Stage;
  student: StudentInfo;
  course: CourseInfo;
  agentId: string;
  counsellorId?: string;
  documents: ApplicationDocument[];
  notes: ApplicationNote[];
  aiAssessments: AiAssessmentRecord[];
}

export interface AuthContext {
  userId: string;
  role: Role;
  agentId?: string;
  name: string;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
  rule?: string;
  hint?: string;
}

export interface ActionDefinition {
  id: ContextualAction;
  label: string;
  allowedStages: Stage[];
  allowedRoles: Role[];
  targetStage?: TerminalStage;
  sideEffects: string[];
  auditType: string;
}

export interface AvailableTransition {
  targetStage: Stage;
  label: string;
  blocked: boolean;
  reason?: string;
  rule?: string;
  hint?: string;
}

export interface AvailableAction {
  action: ContextualAction;
  label: string;
  blocked: boolean;
  reason?: string;
  hint?: string;
}
