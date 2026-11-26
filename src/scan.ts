import { decodeComponent } from './codec.js';
import type { DecodeMode, ScanEntry } from './types.js';

/** Lazily iterate over raw query spans. Component strings are decoded only on demand. */
export function scan(input: string): IterableIterator<ScanEntry> {
  let cursor = input.length > 0 && input.charCodeAt(0) === 63 ? 1 : 0;
  if (cursor < input.length && input.charCodeAt(cursor) === 35) cursor = input.length;
  return (function* (): IterableIterator<ScanEntry> {
    while (cursor < input.length) {
      let end = cursor;
      while (end < input.length) {
        const code = input.charCodeAt(end);
        if (code === 38 || code === 35) break;
        end++;
      }
      if (end > cursor) {
        let equals = cursor;
        while (equals < end && input.charCodeAt(equals) !== 61) equals++;
        const keyStart = cursor;
        const hasEquals = equals < end;
        const keyEnd = hasEquals ? equals : end;
        const valueStart = hasEquals ? equals + 1 : end;
        const valueEnd = end;
        const entry: ScanEntry = {
          source: input,
          keyStart,
          keyEnd,
          valueStart,
          valueEnd,
          hasEquals,
          decodeKey: (mode: DecodeMode = 'replace') => decodeComponent(input.slice(keyStart, keyEnd), mode),
          decodeValue: (mode: DecodeMode = 'replace') => hasEquals ? decodeComponent(input.slice(valueStart, valueEnd), mode) : null,
          decode: (mode: DecodeMode = 'replace') => ({
            key: decodeComponent(input.slice(keyStart, keyEnd), mode),
            value: hasEquals ? decodeComponent(input.slice(valueStart, valueEnd), mode) : null,
          }),
        };
        yield entry;
      }
      if (end >= input.length || input.charCodeAt(end) === 35) return;
      cursor = end + 1;
    }
  })();
}
