export function nativeTypeToString(
  input: readonly [string, readonly string[]],
) {
  const result = input[0];
  if (input[1].length === 0) {
    return result;
  }
  return `${result}(${input[1].join(",")})`;
}

export function fromPascalCaseToSpaced(s: string) {
  return s
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isArray(_: unknown): _ is any[] | readonly any[] {
  return Array.isArray(_);
}
