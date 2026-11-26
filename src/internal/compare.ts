import type { DecodeMode } from '../types.js';
import { decodeComponentSpan } from './decode.js';
import { CHAR_CODE } from './constants.js';

/** Compare a raw component span with an already-decoded key without allocating
 * a substring for the common unescaped ASCII/Unicode case. */
export function componentSpanEquals(
  input: string,
  start: number,
  end: number,
  expected: string,
  mode: DecodeMode = 'replace',
): boolean {
  // Throw mode must validate every visited component, even when an early
  // character mismatch would otherwise let the comparison short-circuit.
  if (mode === 'throw') return decodeComponentSpan(input, start, end, mode) === expected;

  if (end - start !== expected.length) {
    // Encoded components can shrink during decoding, so only reject a length
    // mismatch when the source contains no escape or form-space marker.
    for (let i = start; i < end; i++) {
      const code = input.charCodeAt(i);
      if (code === CHAR_CODE.PLUS || code === CHAR_CODE.PERCENT) return decodeComponentSpan(input, start, end, mode) === expected;
    }
    return false;
  }

  for (let i = 0; i < expected.length; i++) {
    const code = input.charCodeAt(start + i);
    if (code === CHAR_CODE.PLUS || code === CHAR_CODE.PERCENT) return decodeComponentSpan(input, start, end, mode) === expected;
    if (code !== expected.charCodeAt(i)) return false;
  }
  return true;
}
