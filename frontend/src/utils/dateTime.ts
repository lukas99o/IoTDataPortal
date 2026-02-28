const timezoneSuffixPattern = /(Z|[+-]\d{2}:\d{2})$/i;

export function parseApiTimestamp(timestamp: string) {
  if (timezoneSuffixPattern.test(timestamp)) {
    return new Date(timestamp);
  }

  return new Date(`${timestamp}Z`);
}
