import { decodeComponent } from './codec.js';
import { walk } from './walk.js';
import type { DecodeMode } from './types.js';

export function get(input: string, key: string, mode: DecodeMode = 'replace'): string | null | undefined {
  let found = false;
  let value: string | null | undefined;
  walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
    if (decodeComponent(input.slice(keyStart, keyEnd), mode) !== key) return;
    found = true;
    value = hasEquals ? decodeComponent(input.slice(valueStart, valueEnd), mode) : null;
    return false;
  });
  return found ? value : undefined;
}

export function has(input: string, key: string, mode: DecodeMode = 'replace'): boolean {
  let found = false;
  walk(input, (keyStart, keyEnd) => {
    if (decodeComponent(input.slice(keyStart, keyEnd), mode) === key) {
      found = true;
      return false;
    }
  });
  return found;
}

export function getAll(input: string, key: string, mode: DecodeMode = 'replace'): (string | null)[] {
  const values: (string | null)[] = [];
  walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
    if (decodeComponent(input.slice(keyStart, keyEnd), mode) === key) values.push(hasEquals ? decodeComponent(input.slice(valueStart, valueEnd), mode) : null);
  });
  return values;
}

export function pick(input: string, keys: readonly string[], mode: DecodeMode = 'replace'): Record<string, string | null | (string | null)[]> {
  const wanted = new Set(keys);
  const result = Object.create(null) as Record<string, string | null | (string | null)[]>;
  if (wanted.size === 0) return result;
  walk(input, (keyStart, keyEnd, valueStart, valueEnd, hasEquals) => {
    const key = decodeComponent(input.slice(keyStart, keyEnd), mode);
    if (!wanted.has(key)) return;
    const value = hasEquals ? decodeComponent(input.slice(valueStart, valueEnd), mode) : null;
    if (!Object.hasOwn(result, key)) result[key] = value;
    else {
      const previous = result[key]!;
      if (Array.isArray(previous)) previous.push(value);
      else result[key] = [previous, value];
    }
  });
  return result;
}
