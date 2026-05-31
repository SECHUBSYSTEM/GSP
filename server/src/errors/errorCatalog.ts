export type ErrorCode =
  | 'USER_NOT_FOUND'
  | 'FORBIDDEN_ROLE'
  | 'TRANSITION_BLOCKED'
  | 'INVALID_TRANSITION'
  | 'TERMINAL_STATE'
  | 'STALE_VERSION'
  | 'AGENT_SCOPE'
  | 'APPLICATION_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'ACTION_BLOCKED'
  | 'UNKNOWN_ACTION'
  | 'CLOUDINARY_NOT_CONFIGURED'
  | 'AI_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ErrorDefinition {
  code: ErrorCode;
  message: string;
  hint: string;
  httpStatus: number;
}

export const ERROR_CATALOG: Record<ErrorCode, ErrorDefinition> = {
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'We could not find your user account.',
    hint: 'Create a user with POST /users and set the X-User-Id header.',
    httpStatus: 401,
  },
  FORBIDDEN_ROLE: {
    code: 'FORBIDDEN_ROLE',
    message: 'Your role cannot perform this action.',
    hint: 'Create or select a user with the required role via POST /users.',
    httpStatus: 403,
  },
  TRANSITION_BLOCKED: {
    code: 'TRANSITION_BLOCKED',
    message: 'This stage change is not allowed yet.',
    hint: 'Check the response details and resolve the listed requirements first.',
    httpStatus: 422,
  },
  INVALID_TRANSITION: {
    code: 'INVALID_TRANSITION',
    message: 'You cannot skip stages in the pipeline.',
    hint: 'Move to the next stage in order along the defined pipeline.',
    httpStatus: 422,
  },
  TERMINAL_STATE: {
    code: 'TERMINAL_STATE',
    message: 'This application is closed.',
    hint: 'No further actions are possible on closed applications.',
    httpStatus: 409,
  },
  STALE_VERSION: {
    code: 'STALE_VERSION',
    message: 'Someone else updated this application first.',
    hint: 'Refresh the application and try again.',
    httpStatus: 409,
  },
  AGENT_SCOPE: {
    code: 'AGENT_SCOPE',
    message: 'You can only access your own applications.',
    hint: 'Use the Agent account that submitted this application.',
    httpStatus: 404,
  },
  APPLICATION_NOT_FOUND: {
    code: 'APPLICATION_NOT_FOUND',
    message: 'Application not found.',
    hint: 'Check the application ID and try again.',
    httpStatus: 404,
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'The request data is invalid.',
    hint: 'Review the validation details and correct your input.',
    httpStatus: 400,
  },
  ACTION_BLOCKED: {
    code: 'ACTION_BLOCKED',
    message: 'This action is not allowed.',
    hint: 'Check the current stage and your role permissions.',
    httpStatus: 422,
  },
  UNKNOWN_ACTION: {
    code: 'UNKNOWN_ACTION',
    message: 'Unknown contextual action.',
    hint: 'Use GET /applications/:id/available-actions to see valid actions.',
    httpStatus: 400,
  },
  CLOUDINARY_NOT_CONFIGURED: {
    code: 'CLOUDINARY_NOT_CONFIGURED',
    message: 'Document upload is not configured.',
    hint: 'Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.',
    httpStatus: 503,
  },
  AI_UNAVAILABLE: {
    code: 'AI_UNAVAILABLE',
    message: 'AI assessment could not be completed.',
    hint: 'Proceed with manual review — AI assessment is advisory only.',
    httpStatus: 503,
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    hint: 'Try again. If the problem persists, check server logs.',
    httpStatus: 500,
  },
};

export function lookupError(code: ErrorCode): ErrorDefinition {
  return ERROR_CATALOG[code];
}
