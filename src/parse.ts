import { decodeComponentSpan } from './codec.js';
import { appendQueryValue } from './internal/append-value.js';
import { walk } from './walk.js';
import type { ParseOptions } from './types.js';

export type ParsedQuery = Record<string, string | null | (string | null)[]>;

export function parse(input: string, options: ParseOptions = {}): ParsedQuery {
  const result = Object.create(null) as ParsedQuery;
  const mode = options.decode ?? 'replace';
  const duplicates = options.duplicates ?? 'combine';

  walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
    const key = decodeComponentSpan(input, keyStart, keyEnd, mode);
    const value = hasEquals ? decodeComponentSpan(input, valueStart, valueEnd, mode) : null;

    if (duplicates === 'first' && Object.hasOwn(result, key)) {return;}

    if (duplicates === 'last') {
      result[key] = value;

      return;
    }

    appendQueryValue(result, key, value);
  });

  return result;
}
