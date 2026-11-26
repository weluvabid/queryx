import { componentSpanEquals, decodeComponentSpan } from './codec.js';
import { appendQueryValue } from './internal/append-value.js';
import { walk } from './walk.js';
import type { DecodeMode } from './types.js';

export function get(
  input: string,
  key: string,
  mode: DecodeMode = 'replace',
): string | null | undefined {
  let found = false;
  let value: string | null | undefined;

  walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
    if (!componentSpanEquals(input, keyStart, keyEnd, key, mode)) {
      return;
    }

    found = true;
    value = hasEquals ? decodeComponentSpan(input, valueStart, valueEnd, mode) : null;

    return false;
  });

  return found ? value : undefined;
}

export function has(input: string, key: string, mode: DecodeMode = 'replace'): boolean {
  let found = false;

  walk(input, (keyStart, keyEnd) => {
    if (componentSpanEquals(input, keyStart, keyEnd, key, mode)) {
      found = true;

      return false;
    }
  });

  return found;
}

export function getAll(
  input: string,
  key: string,
  mode: DecodeMode = 'replace',
): (string | null)[] {
  const values: (string | null)[] = [];

  walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
    if (componentSpanEquals(input, keyStart, keyEnd, key, mode)) {
      values.push(hasEquals ? decodeComponentSpan(input, valueStart, valueEnd, mode) : null);
    }
  });

  return values;
}

export function pick(
  input: string,
  keys: readonly string[],
  mode: DecodeMode = 'replace',
): Record<string, string | null | (string | null)[]> {
  const wanted = new Set(keys);
  const result = Object.create(null) as Record<string, string | null | (string | null)[]>;

  if (wanted.size === 0) {
    return result;
  }

  // A single requested key can be compared against raw spans without decoding
  // every input key. Multi-key selection keeps Set membership for O(1) lookup.
  if (wanted.size === 1) {
    const target = wanted.values().next().value as string;

    walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
      if (!componentSpanEquals(input, keyStart, keyEnd, target, mode)) {
        return;
      }

      const value = hasEquals ? decodeComponentSpan(input, valueStart, valueEnd, mode) : null;

      appendQueryValue(result, target, value);
    });

    return result;
  }

  walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
    const key = decodeComponentSpan(input, keyStart, keyEnd, mode);

    if (!wanted.has(key)) {
      return;
    }

    const value = hasEquals ? decodeComponentSpan(input, valueStart, valueEnd, mode) : null;

    appendQueryValue(result, key, value);
  });

  return result;
}
