import { decodeComponentSpan } from './codec.js';
import type { DecodeMode, ScanEntry } from './types.js';

/** One allocation per entry; decoding methods are shared on the prototype. */
class ScanEntryImpl implements ScanEntry {
  constructor(
    readonly source: string,
    readonly keyStart: number,
    readonly keyEnd: number,
    readonly valueStart: number,
    readonly valueEnd: number,
    readonly hasEquals: boolean,
  ) {}

  decodeKey(mode: DecodeMode = 'replace'): string {
    return decodeComponentSpan(this.source, this.keyStart, this.keyEnd, mode);
  }

  decodeValue(mode: DecodeMode = 'replace'): string | null {
    return this.hasEquals
      ? decodeComponentSpan(this.source, this.valueStart, this.valueEnd, mode)
      : null;
  }

  decode(mode: DecodeMode = 'replace'): { key: string; value: string | null } {
    return {
      key: this.decodeKey(mode),
      value: this.decodeValue(mode),
    };
  }
}

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
        const hasEquals = equals < end;
        yield new ScanEntryImpl(
          input,
          cursor,
          hasEquals ? equals : end,
          hasEquals ? equals + 1 : end,
          end,
          hasEquals,
        );
      }
      if (end >= input.length || input.charCodeAt(end) === 35) return;
      cursor = end + 1;
    }
  })();
}
