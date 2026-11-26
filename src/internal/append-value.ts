/** Append a duplicate query value using the package's scalar-or-array representation. */
export function appendQueryValue(
  target: Record<string, string | null | (string | null)[]>,
  key: string,
  value: string | null,
): void {
  if (!Object.hasOwn(target, key)) {
    target[key] = value;

    return;
  }

  const previous = target[key];

  if (previous === undefined) {
    target[key] = value;
  } else if (Array.isArray(previous)) {
    previous.push(value);
  } else {
    target[key] = [previous, value];
  }
}
