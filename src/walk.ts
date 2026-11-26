import { CHAR_CODE } from './internal/constants.js';
import { findEquals, findSegmentEnd } from './internal/span-cursor.js';

export type SpanVisitor = (
  keyStart: number,
  keyEnd: number,
  valueStart: number,
  valueEnd: number,
  hasEquals: boolean,
) => boolean | void;

/** Visit raw parameter spans without allocating a public ScanEntry per item. */
export function walk(input: string, visit: SpanVisitor): void {
  const length = input.length;
  let cursor = length > 0 && input.charCodeAt(0) === CHAR_CODE.QUESTION_MARK ? 1 : 0;

  if (cursor < length && input.charCodeAt(cursor) === CHAR_CODE.HASH) {
    return;
  }

  while (cursor < length) {
    const end = findSegmentEnd(input, cursor, length);

    if (end > cursor) {
      const equals = findEquals(input, cursor, end);
      const hasEquals = equals < end;

      if (
        visit(cursor, hasEquals ? equals : end, hasEquals ? equals + 1 : end, end, hasEquals) ===
        false
      ) {
        return;
      }
    }

    if (end >= length || input.charCodeAt(end) === CHAR_CODE.HASH) {
      return;
    }

    cursor = end + 1;
  }
}
