import type { QueryValue } from '../types.js';

type QueryScalar = Exclude<QueryValue, readonly unknown[]>;

/** Convert supported query scalars while preserving null as a valueless parameter. */
export function toQueryScalar(value: QueryScalar): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Queryx cannot serialize non-finite numbers');
    return String(value);
  }
  if (typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  throw new TypeError(`Unsupported query value: ${typeof value}`);
}
