function isRfc3986SafeAscii(input: string): boolean {
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);

    if (!(
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      code === 0x2d ||
      code === 0x2e ||
      code === 0x5f ||
      code === 0x7e
    )) {
      return false;
    }
  }

  return true;
}

/** Delegate UTF-8 and lone-surrogate handling to the platform URI encoder. */
function encodeUriComponent(input: string): string {
  try {
    return encodeURIComponent(input);
  } catch {
    // Match the package's replacement behavior for isolated UTF-16 surrogates.
    const parts: string[] = [];
    let start = 0;

    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);

      if (code >= 0xd800 && code <= 0xdbff) {
        const next = input.charCodeAt(i + 1);

        if (next >= 0xdc00 && next <= 0xdfff) {
          i++;
          continue;
        }
      } else if (code < 0xdc00 || code > 0xdfff) {
        continue;
      }

      parts.push(input.slice(start, i), '\uFFFD');
      start = i + 1;
    }

    parts.push(input.slice(start));

    return encodeURIComponent(parts.join(''));
  }
}

/** Replace encodeURIComponent's five RFC 3986 exceptions without a regex callback. */
function escapeRfc3986Extras(encoded: string): string {
  let output = '';
  let segmentStart = 0;

  for (let i = 0; i < encoded.length; i++) {
    const code = encoded.charCodeAt(i);
    let replacement: string;

    switch (code) {
      case 33:
        replacement = '%21';
        break;
      case 39:
        replacement = '%27';
        break;
      case 40:
        replacement = '%28';
        break;
      case 41:
        replacement = '%29';
        break;
      case 42:
        replacement = '%2A';
        break;
      default:
        continue;
    }

    output += encoded.slice(segmentStart, i) + replacement;
    segmentStart = i + 1;
  }

  return segmentStart === 0 ? encoded : output + encoded.slice(segmentStart);
}

export function encodeComponent(input: string): string {
  // Keys and identifiers commonly consist entirely of RFC 3986 unreserved
  // ASCII. Return the original string without invoking the URI encoder.
  if (isRfc3986SafeAscii(input)) {
    return input;
  }

  return escapeRfc3986Extras(encodeUriComponent(input));
}

/**
 * WHATWG application/x-www-form-urlencoded encoding.
 * Its safe set is alphanumeric plus '*', '-', '.', and '_'; spaces become '+'.
 */
export function encodeFormComponent(input: string): string {
  if (isFormSafeAscii(input)) {
    return input;
  }

  const encoded = encodeUriComponent(input);
  let output = '';
  let segmentStart = 0;

  for (let i = 0; i < encoded.length; i++) {
    const code = encoded.charCodeAt(i);
    let replacement: string;
    let consumed = 1;

    if (code === 37 && encoded.charCodeAt(i + 1) === 50 && encoded.charCodeAt(i + 2) === 48) {
      replacement = '+';
      consumed = 3;
    } else {
      switch (code) {
        case 33:
          replacement = '%21';
          break;
        case 39:
          replacement = '%27';
          break;
        case 40:
          replacement = '%28';
          break;
        case 41:
          replacement = '%29';
          break;
        case 126:
          replacement = '%7E';
          break;
        default:
          continue;
      }
    }

    output += encoded.slice(segmentStart, i) + replacement;
    i += consumed - 1;
    segmentStart = i + 1;
  }

  return segmentStart === 0 ? encoded : output + encoded.slice(segmentStart);
}

function isFormSafeAscii(input: string): boolean {
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);

    if (!(
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      code === 0x2a ||
      code === 0x2d ||
      code === 0x2e ||
      code === 0x5f
    )) {
      return false;
    }
  }

  return true;
}
