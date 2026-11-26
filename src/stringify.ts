import { encodeComponent, encodeFormComponent } from './codec.js';
import { toQueryScalar } from './internal/value.js';
import type { QueryRecord, QueryValue, StringifyOptions } from './types.js';

type Scalar = Exclude<QueryValue, readonly unknown[]>;
type ComponentEncoder = (value: string) => string;

function serialize(
  input: QueryRecord,
  options: Omit<StringifyOptions, 'encode'>,
  encoder: ComponentEncoder | undefined,
): string {
  const keys = Object.keys(input);

  if (options.order === 'sorted') {
    keys.sort();
  }

  const skipNull = options.skipNull ?? false;
  const skipEmpty = options.skipEmptyString ?? false;
  let output = '';
  let first = true;

  for (const key of keys) {
    const raw = input[key];

    if (raw === undefined) {
      continue;
    }

    const encodedKey = encoder ? encoder(key) : key;
    const array = Array.isArray(raw) ? raw : undefined;
    let itemIndex = 0;

    // One loop handles both scalar and array values without allocating a
    // temporary one-element array or calling a per-item closure.
    while (array ? itemIndex < array.length : itemIndex === 0) {
      const item = (array ? array[itemIndex++] : (itemIndex++, raw)) as Scalar;

      if (item === undefined) {
        continue;
      }

      const value = toQueryScalar(item);

      if (value === null) {
        if (skipNull) {
          continue;
        }

        if (!first) {
          output += '&';
        }

        output += encodedKey;
        first = false;
        continue;
      }

      if (skipEmpty && value === '') {
        continue;
      }

      if (!first) {
        output += '&';
      }

      output += `${encodedKey}=${encoder ? encoder(value) : value}`;
      first = false;
    }
  }

  return output;
}

/** Serialize using RFC 3986 component encoding by default. */
export function stringify(input: QueryRecord, options: StringifyOptions = {}): string {
  return serialize(input, options, options.encode === false ? undefined : encodeComponent);
}

/** Serialize using WHATWG application/x-www-form-urlencoded encoding. */
export function stringifyForm(
  input: QueryRecord,
  options: Omit<StringifyOptions, 'encode'> = {},
): string {
  return serialize(input, options, encodeFormComponent);
}
