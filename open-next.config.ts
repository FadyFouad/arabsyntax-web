import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// The site is 100% prerendered (SSG) — no ISR, no on-demand revalidation. Without
// an incremental cache, OpenNext re-renders every prerendered page in the Worker
// on each edge-cache miss (x-nextjs-cache: MISS), which is CPU-heavy for large
// pages (e.g. the matn reader: zod-validating a ~67 KB JSON and rendering 254
// verse lines) and intermittently trips "Worker exceeded CPU time limit" (1101 /
// 503). The static-assets cache serves the prerendered HTML/RSC straight from the
// deployed Workers assets, so prerendered routes are no longer re-rendered at
// request time. Suitable here precisely because we never revalidate.
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
