import type { AuthContext, Role } from './types.js';

export const PERMISSIONS = {
  CREATE_APPLICATION: ['agent', 'counsellor'] as Role[],
  LIST_ALL_APPLICATIONS: ['counsellor', 'qa_officer', 'admission_officer'] as Role[],
  VIEW_INTERNAL: ['counsellor', 'qa_officer', 'admission_officer'] as Role[],
  TRANSITION: ['counsellor', 'qa_officer', 'admission_officer'] as Role[],
  CONTEXTUAL_ACTION: ['agent', 'counsellor', 'qa_officer', 'admission_officer'] as Role[],
  UPLOAD_DOCUMENT: ['agent', 'counsellor', 'admission_officer'] as Role[],
  ADD_NOTE: ['agent', 'counsellor', 'qa_officer', 'admission_officer'] as Role[],
  VIEW_AUDIT_LOG: ['counsellor', 'qa_officer', 'admission_officer'] as Role[],
  VIEW_AI_ASSESSMENT: ['counsellor', 'qa_officer', 'admission_officer'] as Role[],
  MANAGE_USERS: ['counsellor', 'qa_officer', 'admission_officer'] as Role[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

export function isInternalRole(role: Role): boolean {
  return role !== 'agent';
}

export function assertPermission(role: Role, permission: Permission): boolean {
  return roleHasPermission(role, permission);
}
