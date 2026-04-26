const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function safeHref(url: string): string {
  try {
    const { protocol } = new URL(url);
    return ALLOWED_PROTOCOLS.has(protocol) ? url : "#";
  } catch {
    return "#";
  }
}
