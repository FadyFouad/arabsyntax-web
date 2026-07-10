import { describe, it, expect } from 'vitest';
import {
  resolvePremium,
  ENTITLEMENT_ENDED_STATUSES,
  type PurchaseDoc,
} from '@/lib/firebase/contracts/premium';

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: specs/006-web-account-sync/contracts/premium-resolution.md
//
// Ported from the deployed Cloud Function's `hasPremiumEntitlement()`
// (functions/src/ai/handlers/explainVerse.ts:160-182) with ONE intentional
// delta, asserted below. Premium is never derived from `currentPlan` alone —
// that field never downgrades (audit BL-2), so status and expiry must be
// consulted for subscriptions.
// ─────────────────────────────────────────────────────────────────────────────

const NOW = Date.UTC(2026, 6, 10); // 2026-07-10
const future = { toMillis: () => NOW + 86_400_000 };
const past = { toMillis: () => NOW - 86_400_000 };
const exactlyNow = { toMillis: () => NOW };

const doc = (d: PurchaseDoc): PurchaseDoc => d;

describe('resolvePremium — plan gate', () => {
  it('grants premium for lifetime regardless of status or expiry', () => {
    expect(resolvePremium(doc({ currentPlan: 'lifetime' }), NOW)).toBe(true);
    expect(
      resolvePremium(
        doc({ currentPlan: 'lifetime', subscriptionStatus: 'expired', subscriptionExpiryDate: past }),
        NOW,
      ),
    ).toBe(true);
  });

  it.each([
    ['a missing document', undefined],
    ['a null document', null],
    ['an empty document', {}],
    ['an absent plan', { subscriptionStatus: 'active' }],
    ['an unknown plan', { currentPlan: 'trial' }],
    ['a null plan', { currentPlan: null }],
  ])('resolves free for %s', (_label, data) => {
    expect(resolvePremium(data as PurchaseDoc | null | undefined, NOW)).toBe(false);
  });
});

describe('resolvePremium — the legacyPremium delta (D-5 / FR-13)', () => {
  // ⚠ DO NOT "FIX" THIS. The deployed Cloud Function grants `legacyPremium`;
  // the web resolver deliberately does not. Locked product decision D-5: the
  // cohort is <1/1000 users and is granted manually on request. A future diff
  // against the function will look like a bug — it is not. See the contract's
  // "do not fix" warning before touching this.
  it('resolves free for legacyPremium, unlike the Cloud Function', () => {
    expect(resolvePremium(doc({ currentPlan: 'legacyPremium' }), NOW)).toBe(false);
  });

  it('stays free for legacyPremium even with an active status and future expiry', () => {
    expect(
      resolvePremium(
        doc({
          currentPlan: 'legacyPremium',
          subscriptionStatus: 'active',
          subscriptionExpiryDate: future,
        }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('resolvePremium — subscription status gate', () => {
  it('exposes exactly the four ended statuses from the function', () => {
    expect([...ENTITLEMENT_ENDED_STATUSES].sort()).toEqual([
      'expired',
      'paused',
      'refunded',
      'revoked',
    ]);
  });

  const plans = ['monthly', 'yearly'] as const;

  for (const currentPlan of plans) {
    it.each([...ENTITLEMENT_ENDED_STATUSES])(
      `denies ${currentPlan} when subscriptionStatus is %s`,
      (subscriptionStatus) => {
        expect(
          resolvePremium(doc({ currentPlan, subscriptionStatus, subscriptionExpiryDate: future }), NOW),
        ).toBe(false);
      },
    );

    it(`grants ${currentPlan} when cancelled but not yet expired (auto-renew off)`, () => {
      // 'cancelled' is deliberately absent from the ended set: the user keeps
      // access through the period they already paid for.
      expect(
        resolvePremium(
          doc({ currentPlan, subscriptionStatus: 'cancelled', subscriptionExpiryDate: future }),
          NOW,
        ),
      ).toBe(true);
    });

    it(`grants ${currentPlan} when cancelled with no expiry recorded`, () => {
      expect(resolvePremium(doc({ currentPlan, subscriptionStatus: 'cancelled' }), NOW)).toBe(true);
    });

    it(`denies ${currentPlan} when cancelled and the period has ended`, () => {
      expect(
        resolvePremium(
          doc({ currentPlan, subscriptionStatus: 'cancelled', subscriptionExpiryDate: past }),
          NOW,
        ),
      ).toBe(false);
    });
  }
});

describe('resolvePremium — expiry gate', () => {
  it.each(['monthly', 'yearly'] as const)('denies %s once expiry is in the past', (currentPlan) => {
    expect(resolvePremium(doc({ currentPlan, subscriptionExpiryDate: past }), NOW)).toBe(false);
  });

  it.each(['monthly', 'yearly'] as const)('denies %s at exactly the expiry instant', (currentPlan) => {
    // The function uses `<= now`, not `<`.
    expect(resolvePremium(doc({ currentPlan, subscriptionExpiryDate: exactlyNow }), NOW)).toBe(false);
  });

  it.each(['monthly', 'yearly'] as const)('grants %s with a future expiry', (currentPlan) => {
    expect(resolvePremium(doc({ currentPlan, subscriptionExpiryDate: future }), NOW)).toBe(true);
  });

  it.each(['monthly', 'yearly'] as const)('trusts %s with no expiry field at all', (currentPlan) => {
    expect(resolvePremium(doc({ currentPlan }), NOW)).toBe(true);
  });

  it.each(['monthly', 'yearly'] as const)('trusts %s with a null expiry', (currentPlan) => {
    expect(resolvePremium(doc({ currentPlan, subscriptionExpiryDate: null }), NOW)).toBe(true);
  });

  it('ignores an unrecognised status and falls through to the expiry check', () => {
    expect(
      resolvePremium(
        doc({ currentPlan: 'monthly', subscriptionStatus: 'in_grace_period', subscriptionExpiryDate: past }),
        NOW,
      ),
    ).toBe(false);
    expect(
      resolvePremium(
        doc({ currentPlan: 'monthly', subscriptionStatus: 'in_grace_period', subscriptionExpiryDate: future }),
        NOW,
      ),
    ).toBe(true);
  });
});
