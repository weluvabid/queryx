import type { DecodeMode } from '../types.js';
import { CHAR_CODE } from './constants.js';

const HEX = new Int8Array(128).fill(-1);

for (let i = 0; i < 10; i++) {HEX[48 + i] = i;}

for (let i = 0; i < 6; i++) {
  HEX[65 + i] = 10 + i;
  HEX[97 + i] = 10 + i;
}

function hexValue(code: number): number {
  return code < 128 ? HEX[code]! : -1;
}

export function decodeComponent(input: string, mode: DecodeMode = 'replace'): string {
  return decodeComponentSpan(input, 0, input.length, mode);
}

/** Decode a source span without first allocating an intermediate substring. */
export function decodeComponentSpan(
  input: string,
  start: number,
  end: number,
  mode: DecodeMode = 'replace',
): string {
  let hasPlus = false;
  let hasPercent = false;

  for (let i = start; i < end; i++) {
    const code = input.charCodeAt(i);

    if (code === CHAR_CODE.PLUS) {hasPlus = true;}
    else if (code === CHAR_CODE.PERCENT) {hasPercent = true;}

    if (hasPlus && hasPercent) {break;}
  }

  if (!hasPlus && !hasPercent) {return input.slice(start, end);}

  let normalized: string;

  if (hasPlus) {
    // Build the normalized component in one pass, avoiding a slice followed by
    // a global replacement. The source span remains untouched.
    normalized = '';
    let segmentStart = start;

    for (let i = start; i < end; i++) {
      if (input.charCodeAt(i) !== CHAR_CODE.PLUS) {continue;}

      normalized += `${input.slice(segmentStart, i)  } `;
      segmentStart = i + 1;
    }

    normalized += input.slice(segmentStart, end);
  } else {
    normalized = input.slice(start, end);
  }

  if (!hasPercent) {return normalized;}

  if (mode === 'throw') {return decodeURIComponent(normalized);}

  try {
    return decodeURIComponent(normalized);
  } catch {
    /* Recover malformed UTF-8 without discarding valid neighboring escapes. */
  }

  const chunks: string[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: mode === 'preserve', ignoreBOM: true });
  let plainStart = 0;
  let cursor = 0;

  while (cursor < normalized.length) {
    if (normalized.charCodeAt(cursor) !== CHAR_CODE.PERCENT) {
      cursor++;
      continue;
    }

    chunks.push(normalized.slice(plainStart, cursor));
    const runStart = cursor;
    const bytes: number[] = [];

    while (cursor + 2 < normalized.length && normalized.charCodeAt(cursor) === CHAR_CODE.PERCENT) {
      const high = hexValue(normalized.charCodeAt(cursor + 1));
      const low = hexValue(normalized.charCodeAt(cursor + 2));

      if (high < 0 || low < 0) {break;}

      bytes.push((high << 4) | low);
      cursor += 3;
    }

    if (bytes.length === 0) {
      chunks.push('%');
      cursor++;
    } else {
      const encodedRun = normalized.slice(runStart, cursor);

      try {
        chunks.push(decoder.decode(Uint8Array.from(bytes)));
      } catch {
        chunks.push(encodedRun);
      }
    }

    plainStart = cursor;
  }

  chunks.push(normalized.slice(plainStart));

  return chunks.join('');
}
