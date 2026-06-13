import { describe, it, expect } from 'vitest';
import { featureFlags } from '@/lib/featureFlags';

// featureFlags gates what renders (e.g. the Pricing section). These assertions
// pin the SHIPPING defaults so a flag can't be flipped by accident without a
// failing test forcing the change to be deliberate.
describe('featureFlags', () => {
  it('ships with pricing hidden by default', () => {
    expect(featureFlags.showPricing).toBe(false);
  });

  it('exposes every flag as a boolean', () => {
    for (const [name, value] of Object.entries(featureFlags)) {
      expect(typeof value, name).toBe('boolean');
    }
  });
});
