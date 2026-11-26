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
  let hasPlus = false;
  let hasPercent = false;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code === 43) hasPlus = true;
    else if (code === 37) hasPercent = true;
    if (hasPlus && hasPercent) break;
  }
  if (!hasPlus && !hasPercent) return input;
  const normalized = hasPlus ? input.replace(/\+/g, ' ') : input;
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

export function encodeComponent(input: string): string {
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
  return encoded.replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function encodeFormComponent(input: string): string {
  return encodeComponent(input).replace(/%20/g, '+');
}
