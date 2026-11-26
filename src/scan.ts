import { decodeComponentSpan } from './codec.js';
import { CHAR_CODE } from './internal/constants.js';
import { findEquals, findSegmentEnd } from './internal/span-cursor.js';
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
    return { key: this.decodeKey(mode), value: this.decodeValue(mode) };
  }
}

/** Lazily iterate over raw query spans. Component strings are decoded only on demand. */
export function scan(input: string): IterableIterator<ScanEntry> {
  const length = input.length;
  let cursor = length > 0 && input.charCodeAt(0) === CHAR_CODE.QUESTION_MARK ? 1 : 0;
  if (cursor < length && input.charCodeAt(cursor) === CHAR_CODE.HASH) cursor = length;

  return (function* (): IterableIterator<ScanEntry> {
    while (cursor < length) {
      const end = findSegmentEnd(input, cursor, length);
      if (end > cursor) {
        const equals = findEquals(input, cursor, end);
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
      if (end >= length || input.charCodeAt(end) === CHAR_CODE.HASH) return;
      cursor = end + 1;
    }
  })();
}
