import { CHAR_CODE } from './constants.js';

/** Find the next '&' or '#' boundary, sharing delimiter semantics across consumers. */
export function findSegmentEnd(input: string, start: number, length: number): number {
  let end = start;

  while (end < length) {
    const code = input.charCodeAt(end);

    if (code === CHAR_CODE.AMPERSAND || code === CHAR_CODE.HASH) {break;}

    end++;
  }

  return end;
}

/** Find the first key/value separator within a parameter segment. */
export function findEquals(input: string, start: number, end: number): number {
  let equals = start;

  while (equals < end && input.charCodeAt(equals) !== CHAR_CODE.EQUALS) {equals++;}

  return equals;
}
