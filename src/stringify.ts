import { encodeComponent, encodeFormComponent } from './codec.js';
import type { QueryRecord, QueryValue, StringifyOptions } from './types.js';

function scalar(value: Exclude<QueryValue, readonly unknown[]>): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Queryx cannot serialize non-finite numbers');
    return String(value);
  }
  if (typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  throw new TypeError(`Unsupported query value: ${typeof value}`);
}

export function stringify(input: QueryRecord, options: StringifyOptions = {}): string {
  const keys = Object.keys(input);
  if (options.order === 'sorted') keys.sort();
  const encode = options.encode === false ? (value: string) => value : encodeComponent;
  const parts: string[] = [];
  const skipNull = options.skipNull ?? false;
  const skipEmpty = options.skipEmptyString ?? false;

  for (const key of keys) {
    const raw = input[key];
    if (raw === undefined) continue;
    const encodedKey = encode(key);

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item === undefined) continue;
        const value = scalar(item as Exclude<QueryValue, readonly unknown[]>);
        if (value === null) {
          if (!skipNull) parts.push(encodedKey);
        } else if (!(skipEmpty && value === '')) {
          parts.push(`${encodedKey}=${encode(value)}`);
        }
      }
      continue;
    }

    const value = scalar(raw as Exclude<QueryValue, readonly unknown[]>);
    if (value === null) {
      if (!skipNull) parts.push(encodedKey);
    } else if (!(skipEmpty && value === '')) {
      parts.push(`${encodedKey}=${encode(value)}`);
    }
  }

  return parts.join('&');
}

export function stringifyForm(input: QueryRecord, options: Omit<StringifyOptions, 'encode'> = {}): string {
  const keys = Object.keys(input);
  if (options.order === 'sorted') keys.sort();
  const parts: string[] = [];
  const skipNull = options.skipNull ?? false;
  const skipEmpty = options.skipEmptyString ?? false;

  for (const key of keys) {
    const raw = input[key];
    if (raw === undefined) continue;
    const encodedKey = encodeFormComponent(key);

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item === undefined) continue;
        const value = scalar(item as Exclude<QueryValue, readonly unknown[]>);
        if (value === null) {
          if (!skipNull) parts.push(encodedKey);
        } else if (!(skipEmpty && value === '')) {
          parts.push(`${encodedKey}=${encodeFormComponent(value)}`);
        }
      }
      continue;
    }

    const value = scalar(raw as Exclude<QueryValue, readonly unknown[]>);
    if (value === null) {
      if (!skipNull) parts.push(encodedKey);
    } else if (!(skipEmpty && value === '')) {
      parts.push(`${encodedKey}=${encodeFormComponent(value)}`);
    }
  }

  return parts.join('&');
}
