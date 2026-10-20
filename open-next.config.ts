import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

// The pages are ISR (`revalidate = 3600`), so their rendered output has to be stored somewhere.
// Without an incremental cache every request rendered the page again (x-nextjs-cache: MISS on
// each visit, about 1 s to first byte, one Supabase round trip per view, and the risk of error
// 1102 under the free plan's CPU limit).
// - R2 (binding NEXT_INC_CACHE_R2_BUCKET) keeps the pages; entries are keyed by build ID, so a
//   deploy starts from its own prerendered pages.
// - The regional cache (Cache API) serves hits from the nearest location without an R2 read;
//   "long-lived" re-uses ISR entries for up to their revalidate time and refreshes them from R2
//   in the background.
// - Time-based revalidation needs a queue: the Durable Object queue (NEXT_CACHE_DO_QUEUE,
//   class DOQueueHandler re-exported from worker.js) regenerates a stale page once, through the
//   WORKER_SELF_REFERENCE service binding.
// - The tag cache records the revalidatePath calls the daily digest makes after saving
//   (lib/jobs/digest.ts). Without it they did nothing, and with about 50 visits a day the page
//   cached before 06:00 kept being served: a stale ISR page is only rebuilt for the visitor
//   after the one who finds it stale. Now the next visit renders the new digest.
//   - Durable Objects (NEXT_TAG_CACHE_DO_SHARDED, class DOShardedTagCache) hold the tags. One
//     shard is plenty for a few revalidatePath calls a day; each region gets its own copy
//     (location hint), so a visitor in Japan reads the APAC one instead of crossing the Pacific.
//     Writes go to every copy.
//   - Lookups are kept in the Cache API for 5 minutes, missing tags included, so most views
//     skip the Durable Object. The cost: in other locations a new digest can take up to
//     5 minutes to appear. Persisting missing tags is safe here because nothing reads Next's
//     fetch data cache (Supabase calls are not cached).
// - Cache interception answers cached routes before the Next server loads.
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
  tagCache: doShardedTagCache({
    baseShardSize: 1,
    regionalCache: true,
    regionalCacheTtlSec: 300,
    regionalCacheDangerouslyPersistMissingTags: true,
    shardReplication: {
      numberOfSoftReplicas: 1,
      numberOfHardReplicas: 1,
      regionalReplication: { defaultRegion: "apac" },
    },
  }),
  enableCacheInterception: true,
});
