import { decodeComponent } from './codec.js';
import { walk } from './walk.js';
import type { ParseOptions } from './types.js';

export type ParsedQuery = Record<string, string | null | (string | null)[]>;

export function parse(input: string, options: ParseOptions = {}): ParsedQuery {
  const result = Object.create(null) as ParsedQuery;
  const mode = options.decode ?? 'replace';
  const duplicates = options.duplicates ?? 'combine';
  walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
    const key = decodeComponent(input.slice(keyStart, keyEnd), mode);
    const value = hasEquals ? decodeComponent(input.slice(valueStart, valueEnd), mode) : null;
    if (!Object.hasOwn(result, key)) {
      result[key] = value;
      return;
    }
    if (duplicates === 'first') return;
    if (duplicates === 'last') {
      result[key] = value;
      return;
    }
    const previous = result[key]!;
    if (Array.isArray(previous)) previous.push(value);
    else result[key] = [previous, value];
  });
  return result;
}
