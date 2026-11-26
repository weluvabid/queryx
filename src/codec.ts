import type { DecodeMode } from './types.js';

const HEX = new Int8Array(128).fill(-1);
for (let i = 0; i < 10; i++) HEX[48 + i] = i;
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
    if (code === 43) hasPlus = true;
    else if (code === 37) hasPercent = true;
    if (hasPlus && hasPercent) break;
  }

  if (!hasPlus && !hasPercent) return input.slice(start, end);

  let normalized: string;
  if (hasPlus) {
    // Build the normalized component in one pass, avoiding a slice followed by
    // a global replacement. The source span remains untouched.
    normalized = '';
    let segmentStart = start;
    for (let i = start; i < end; i++) {
      if (input.charCodeAt(i) !== 43) continue;
      normalized += input.slice(segmentStart, i) + ' ';
      segmentStart = i + 1;
    }
    normalized += input.slice(segmentStart, end);
  } else {
    normalized = input.slice(start, end);
  }

  if (!hasPercent) return normalized;
  if (mode === 'throw') return decodeURIComponent(normalized);
  try { return decodeURIComponent(normalized); }
  catch { /* Recover malformed UTF-8 without discarding valid neighboring escapes. */ }

  const chunks: string[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: mode === 'preserve', ignoreBOM: true });
  let plainStart = 0;
  let cursor = 0;
  while (cursor < normalized.length) {
    if (normalized.charCodeAt(cursor) !== 37) { cursor++; continue; }
    chunks.push(normalized.slice(plainStart, cursor));
    const runStart = cursor;
    const bytes: number[] = [];
    while (cursor + 2 < normalized.length && normalized.charCodeAt(cursor) === 37) {
      const high = hexValue(normalized.charCodeAt(cursor + 1));
      const low = hexValue(normalized.charCodeAt(cursor + 2));
      if (high < 0 || low < 0) break;
      bytes.push((high << 4) | low);
      cursor += 3;
    }
    if (bytes.length === 0) {
      chunks.push('%');
      cursor++;
    } else {
      const encodedRun = normalized.slice(runStart, cursor);
      try { chunks.push(decoder.decode(Uint8Array.from(bytes))); }
      catch { chunks.push(encodedRun); }
    }
    plainStart = cursor;
  }
  chunks.push(normalized.slice(plainStart));
  return chunks.join('');
}

const RFC3986_EXTRA_GLOBAL = /[!'()*]/g;

function isRfc3986SafeAscii(input: string): boolean {
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (
      !((code >= 0x41 && code <= 0x5A) ||
        (code >= 0x61 && code <= 0x7A) ||
        (code >= 0x30 && code <= 0x39) ||
        code === 0x2D || code === 0x2E || code === 0x5F || code === 0x7E)
    ) return false;
  }
  return true;
}

export function encodeComponent(input: string): string {
  // Keys and identifiers commonly consist entirely of RFC 3986 unreserved
  // ASCII. Return the original string without invoking the URI encoder.
  if (isRfc3986SafeAscii(input)) return input;

  let encoded: string;
  try {
    encoded = encodeURIComponent(input);
  } catch {
    const parts: string[] = [];
    let start = 0;
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF) {
        const next = input.charCodeAt(i + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) {
          i++;
          continue;
        }
      } else if (code < 0xDC00 || code > 0xDFFF) {
        continue;
      }
      parts.push(input.slice(start, i), '\uFFFD');
      start = i + 1;
    }
    parts.push(input.slice(start));
    encoded = encodeURIComponent(parts.join(''));
  }
  return encoded.replace(RFC3986_EXTRA_GLOBAL, character =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function encodeFormComponent(input: string): string {
  const encoded = encodeComponent(input);
  const firstSpace = encoded.indexOf('%20');
  if (firstSpace < 0) return encoded;

  // Convert encoded spaces without a second regex replacement pass.
  let output = encoded.slice(0, firstSpace);
  let cursor = firstSpace;
  while (cursor < encoded.length) {
    const next = encoded.indexOf('%20', cursor);
    if (next < 0) {
      output += encoded.slice(cursor);
      break;
    }
    output += encoded.slice(cursor, next) + '+';
    cursor = next + 3;
  }
  return output;
}

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
      if (code === 43 || code === 37) return decodeComponentSpan(input, start, end, mode) === expected;
    }
    return false;
  }

  for (let i = 0; i < expected.length; i++) {
    const code = input.charCodeAt(start + i);
    if (code === 43 || code === 37) return decodeComponentSpan(input, start, end, mode) === expected;
    if (code !== expected.charCodeAt(i)) return false;
  }
  return true;
}
