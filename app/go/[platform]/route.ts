import { getCloudflareContext } from '@opennextjs/cloudflare';

import { siteConfig } from '@/lib/siteConfig';

// Server-side app-download tracking. A click on a store badge navigates here
// (e.g. /go/ios?l=en); we record one data point to the APP_DOWNLOADS Workers
// Analytics Engine dataset, then 302 to the real store URL. Counting clicks at
// the edge — rather than with a client beacon — is bot-resistant, ad-blocker-
// proof, and needs no cookies or consent banner. Query the data later via the
// GraphQL Analytics API (workersAnalyticsEngineAdaptiveGroups, dataset
// "app_downloads"), the same source the Web Analytics page-view numbers come
// from.

// Always run in the worker per request — never prerender or cache a redirect.
export const dynamic = 'force-dynamic';

// Minimal shape of the Analytics Engine binding we use. Declared locally on
// purpose: the full type lives in the build-time-generated, gitignored
// cloudflare-env.d.ts, but CI typechecks with plain `tsc` (no `wrangler types`
// step), so depending on that global would break the typecheck gate.
type AnalyticsEngineDataset = {
  writeDataPoint(event?: {
    blobs?: (string | null)[];
    doubles?: number[];
    indexes?: (string | ArrayBuffer)[];
  }): void;
};

const STORE_URL: Record<string, string> = {
  ios: siteConfig.stores.appStore,
  android: siteConfig.stores.googlePlay,
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const destination = STORE_URL[platform];

  // Unknown platform → 404 rather than an open redirect.
  if (!destination) {
    return new Response('Not found', { status: 404 });
  }

  const searchParams = new URL(request.url).searchParams;
  const locale = searchParams.get('l') === 'en' ? 'en' : 'ar';
  // Placement that drove the click (e.g. hero, pricing_yearly), for per-CTA
  // conversion attribution. Capped to keep the blob small and bounded.
  const source = (searchParams.get('s') ?? 'unknown').slice(0, 32);

  try {
    // Explicit CfProperties generic so typing doesn't depend on the gitignored
    // runtime-types global (see the note on AnalyticsEngineDataset above).
    const { env, cf } = await getCloudflareContext<{ country?: string }>({
      async: true,
    });
    const dataset = (env as { APP_DOWNLOADS?: AnalyticsEngineDataset })
      .APP_DOWNLOADS;
    dataset?.writeDataPoint({
      // index1 is the grouping/sampling key (max one index, ≤96 bytes).
      indexes: [platform],
      // blob1=platform, blob2=locale, blob3=country, blob4=source placement.
      blobs: [platform, locale, cf?.country ?? 'unknown', source],
      // double1: one click.
      doubles: [1],
    });
  } catch {
    // Analytics is best-effort: a binding miss (e.g. plain `next dev`) or a
    // write error must never block the user's redirect to the store.
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: destination,
      // A click must always reach the worker; never cache the redirect.
      'Cache-Control': 'no-store',
    },
  });
}
