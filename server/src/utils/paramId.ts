export function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0];
  if (!value) throw new Error('Missing route parameter');
  return value;
}
