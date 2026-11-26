export type SpanVisitor = (keyStart: number, keyEnd: number, valueStart: number, valueEnd: number, hasEquals: boolean) => boolean | void;

export function walk(input: string, visit: SpanVisitor): void {
  let cursor = input.length > 0 && input.charCodeAt(0) === 63 ? 1 : 0;
  if (cursor < input.length && input.charCodeAt(cursor) === 35) return;
  const length = input.length;
  while (cursor < length) {
    let end = cursor;
    while (end < length) {
      const code = input.charCodeAt(end);
      if (code === 38 || code === 35) break;
      end++;
    }
    if (end > cursor) {
      let equals = cursor;
      while (equals < end && input.charCodeAt(equals) !== 61) equals++;
      const hasEquals = equals < end;
      if (visit(cursor, hasEquals ? equals : end, hasEquals ? equals + 1 : end, end, hasEquals) === false) return;
    }
    if (end >= length || input.charCodeAt(end) === 35) return;
    cursor = end + 1;
  }
}
