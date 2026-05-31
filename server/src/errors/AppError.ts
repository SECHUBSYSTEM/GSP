import type { ErrorCode } from './errorCatalog.js';
import { lookupError } from './errorCatalog.js';
import { env } from '../config/env.js';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly hint?: string;
  readonly rule?: string;
  readonly details?: unknown;
  readonly noOp?: boolean;

  constructor(
    code: ErrorCode,
    overrides?: {
      message?: string;
      hint?: string;
      rule?: string;
      details?: unknown;
      httpStatus?: number;
      noOp?: boolean;
    }
  ) {
    const def = lookupError(code);
    super(overrides?.message ?? def.message);
    this.code = code;
    this.httpStatus = overrides?.httpStatus ?? def.httpStatus;
    this.hint = overrides?.hint ?? def.hint;
    this.rule = overrides?.rule;
    this.details = overrides?.details;
    this.noOp = overrides?.noOp;
    this.name = 'AppError';
  }

  toJSON() {
    const base: Record<string, unknown> = {
      code: this.code,
      message: this.message,
    };

    if (env.EXPOSE_ERROR_HINTS) {
      if (this.hint) base.hint = this.hint;
      if (this.rule) base.rule = this.rule;
      if (this.details) base.details = this.details;
      if (this.noOp) base.noOp = true;
    }

    return { error: base };
  }
}
