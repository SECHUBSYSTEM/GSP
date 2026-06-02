/** MongoDB duplicate key error (E11000). */
export function isDuplicateKeyError(err: unknown, field?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: number; keyPattern?: Record<string, number> };
  if (e.code !== 11000) return false;
  if (!field) return true;
  return Boolean(e.keyPattern?.[field]);
}
