// Keeps degraded pages short-lived (SHIG 55).
//
// Pages are regenerated every hour (`revalidate = 3600`). When a Supabase call fails, the page
// still renders a constructive error banner, but without this the banner would be stored and
// served for the full hour even after the backend recovers.
//
// A route's revalidate is the lowest value touched during its render, and `unstable_cache`
// lowers it for the current render when awaited. Touching a tiny entry with a short window
// therefore shortens only the renders that hit an error; successful renders keep the hour.
// A positive value is required: `revalidate: 0` makes an ISR page throw at runtime.

export const ERROR_REVALIDATE_SECONDS = 30;

type CacheFn = (
  cb: () => Promise<unknown>,
  keyParts: string[],
  options: { revalidate: number },
) => () => Promise<unknown>;

export function createErrorCacheShortener(
  cacheFn: CacheFn,
  log: (...args: unknown[]) => void = console.error,
): () => Promise<void> {
  const touch = cacheFn(async () => true, ["load-error-short-revalidate"], {
    revalidate: ERROR_REVALIDATE_SECONDS,
  });
  return async () => {
    try {
      await touch();
    } catch (err) {
      // The page is already degraded; failing to shorten its cache must not crash it.
      log("[error-cache] could not shorten the page cache:", err instanceof Error ? err.message : err);
    }
  };
}
