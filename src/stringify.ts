import { encodeComponent, encodeFormComponent } from './codec.js';
import type { QueryRecord, QueryValue, StringifyOptions } from './types.js';

type Scalar = Exclude<QueryValue, readonly unknown[]>;

export function stringify(input: QueryRecord, options: StringifyOptions = {}): string {
  const keys = Object.keys(input);
  if (options.order === 'sorted') keys.sort();
  const encode = options.encode === false ? undefined : encodeComponent;
  const skipNull = options.skipNull ?? false;
  const skipEmpty = options.skipEmptyString ?? false;
  let output = '';
  let first = true;

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const key = keys[keyIndex]!;
    const raw = input[key];
    if (raw === undefined) continue;
    const encodedKey = encode ? encode(key) : key;

    if (Array.isArray(raw)) {
      for (let itemIndex = 0; itemIndex < raw.length; itemIndex++) {
        const item = raw[itemIndex] as Scalar;
        if (item === undefined) continue;
        let value: string | null;
        if (item === null) value = null;
        else if (typeof item === 'string') value = item;
        else if (typeof item === 'number') {
          if (!Number.isFinite(item)) throw new TypeError('Queryx cannot serialize non-finite numbers');
          value = String(item);
        } else if (typeof item === 'bigint' || typeof item === 'boolean') value = String(item);
        else throw new TypeError(`Unsupported query value: ${typeof item}`);

        if (value === null) {
          if (skipNull) continue;
          if (!first) output += '&';
          output += encodedKey;
          first = false;
        } else if (!(skipEmpty && value === '')) {
          if (!first) output += '&';
          output += encodedKey + '=' + (encode ? encode(value) : value);
          first = false;
        }
      }
      continue;
    }

    const item = raw as Scalar;
    let value: string | null;
    if (item === null || item === undefined) value = null;
    else if (typeof item === 'string') value = item;
    else if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new TypeError('Queryx cannot serialize non-finite numbers');
      value = String(item);
    } else if (typeof item === 'bigint' || typeof item === 'boolean') value = String(item);
    else throw new TypeError(`Unsupported query value: ${typeof item}`);

    if (value === null) {
      if (skipNull) continue;
      if (!first) output += '&';
      output += encodedKey;
      first = false;
    } else if (!(skipEmpty && value === '')) {
      if (!first) output += '&';
      output += encodedKey + '=' + (encode ? encode(value) : value);
      first = false;
    }
  }

  return output;
}

export function stringifyForm(input: QueryRecord, options: Omit<StringifyOptions, 'encode'> = {}): string {
  const keys = Object.keys(input);
  if (options.order === 'sorted') keys.sort();
  const skipNull = options.skipNull ?? false;
  const skipEmpty = options.skipEmptyString ?? false;
  let output = '';
  let first = true;

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const key = keys[keyIndex]!;
    const raw = input[key];
    if (raw === undefined) continue;
    const encodedKey = encodeFormComponent(key);

    if (Array.isArray(raw)) {
      for (let itemIndex = 0; itemIndex < raw.length; itemIndex++) {
        const item = raw[itemIndex] as Scalar;
        if (item === undefined) continue;
        let value: string | null;
        if (item === null) value = null;
        else if (typeof item === 'string') value = item;
        else if (typeof item === 'number') {
          if (!Number.isFinite(item)) throw new TypeError('Queryx cannot serialize non-finite numbers');
          value = String(item);
        } else if (typeof item === 'bigint' || typeof item === 'boolean') value = String(item);
        else throw new TypeError(`Unsupported query value: ${typeof item}`);

        if (value === null) {
          if (skipNull) continue;
          if (!first) output += '&';
          output += encodedKey;
          first = false;
        } else if (!(skipEmpty && value === '')) {
          if (!first) output += '&';
          output += encodedKey + '=' + encodeFormComponent(value);
          first = false;
        }
      }
      continue;
    }

    const item = raw as Scalar;
    let value: string | null;
    if (item === null || item === undefined) value = null;
    else if (typeof item === 'string') value = item;
    else if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new TypeError('Queryx cannot serialize non-finite numbers');
      value = String(item);
    } else if (typeof item === 'bigint' || typeof item === 'boolean') value = String(item);
    else throw new TypeError(`Unsupported query value: ${typeof item}`);

    if (value === null) {
      if (skipNull) continue;
      if (!first) output += '&';
      output += encodedKey;
      first = false;
    } else if (!(skipEmpty && value === '')) {
      if (!first) output += '&';
      output += encodedKey + '=' + encodeFormComponent(value);
      first = false;
    }
  }

  return output;
}
