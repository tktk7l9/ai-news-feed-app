// Cloudflare Web Analytics beacon, appended after hydration by components/Analytics.tsx.
// Client-side module: keep it free of server-only imports. next.config.ts allows this origin in
// script-src and the POST target (https://cloudflareinsights.com) in connect-src;
// analytics.test.ts keeps the two in sync.
export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

/**
 * Site token. It ends up in every page and is visible to every visitor, so it is not a secret.
 * gitleaks flags a 32-digit hex as generic-api-key, so gitleaks:allow on the flagged line
 * suppresses it (a config file would also hide real secrets).
 */
export const BEACON_TOKEN = "cd156fbf0fd24da0a12e58fdb4e63828"; // gitleaks:allow
