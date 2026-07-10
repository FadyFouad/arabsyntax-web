export const featureFlags = {
  showPricing: false,
  /**
   * Web accounts (feature 006): Google/Apple sign-in, cloud progress sync, and
   * the premium badge. Read at build time — the site is pure SSG, so a runtime
   * flag would force dynamic rendering for no benefit.
   *
   * While false, no account UI mounts and no Firebase module is reachable from
   * any page's module graph. Production keeps NEXT_PUBLIC_WEB_ACCOUNTS unset
   * until launch gates G-1..G-4 pass (specs/006-web-account-sync/launch-gates.md).
   */
  webAccounts: process.env.NEXT_PUBLIC_WEB_ACCOUNTS === 'true',
} as const;

export type FeatureFlags = typeof featureFlags;
