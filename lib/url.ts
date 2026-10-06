const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** True for an absolute http(s) URL; false for javascript:, data:, relative paths and garbage. */
export function isHttpUrl(url: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function safeHref(url: string): string {
  return isHttpUrl(url) ? url : "#";
}
