export const featureFlags = {
  showPricing: false,
} as const;

export type FeatureFlags = typeof featureFlags;
