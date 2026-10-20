import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// The pages are ISR (`revalidate = 3600`), so their rendered output has to be stored somewhere.
// Without an incremental cache every request rendered the page again (x-nextjs-cache: MISS on
// each visit, about 1 s to first byte, one Supabase round trip per view, and the risk of error
// 1102 under the free plan's CPU limit).
// - R2 (binding NEXT_INC_CACHE_R2_BUCKET) keeps the pages; entries are keyed by build ID, so a
//   deploy starts from its own prerendered pages.
// - The regional cache (Cache API) serves hits from the nearest location without an R2 read;
//   "long-lived" re-uses ISR entries for up to 30 minutes and refreshes them in the background.
// - Time-based revalidation needs a queue: the Durable Object queue (NEXT_CACHE_DO_QUEUE,
//   class DOQueueHandler re-exported from worker.js) regenerates a stale page once, through the
//   WORKER_SELF_REFERENCE service binding.
// - Cache interception answers cached routes before the Next server loads.
// No tag cache: revalidateTag / revalidatePath are not used.
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
  enableCacheInterception: true,
});
