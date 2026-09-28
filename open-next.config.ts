import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Cache settings are left at the defaults. Neither ISR nor on-demand revalidation is used.
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
