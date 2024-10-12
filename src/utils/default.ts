function isStringArray(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.every(value => typeof value === "string");
}

export { isStringArray };