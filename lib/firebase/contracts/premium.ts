/**
 * Pure premium resolver, ported from the deployed Cloud Function's
 * `hasPremiumEntitlement()` (app repo:
 * functions/src/ai/handlers/explainVerse.ts:160-182).
 *
 * Contract: specs/006-web-account-sync/contracts/premium-resolution.md
 *
 * Reads `purchases/{uid}`, which the rules make owner-readable and
 * client-unwritable. The badge this drives is cosmetic (D-4) — it gates nothing.
 */

/** The only field of a Firestore Timestamp this resolver needs. */
interface MillisLike {
  toMillis(): number;
}

export interface PurchaseDoc {
  currentPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiryDate?: MillisLike | null;
}

/**
 * Statuses that end an entitlement immediately.
 *
 * `cancelled` is deliberately ABSENT: turning off auto-renew does not revoke the
 * period the user already paid for. They keep access until `subscriptionExpiryDate`.
 */
export const ENTITLEMENT_ENDED_STATUSES: ReadonlySet<string> = new Set([
  'expired',
  'refunded',
  'revoked',
  'paused',
]);

export function resolvePremium(data: PurchaseDoc | null | undefined, now: number): boolean {
  if (!data) return false;

  const plan = data.currentPlan;
  if (plan === 'lifetime') return true;

  // ⚠ INTENTIONAL DELTA — DO NOT "FIX" (locked decision D-5 / FR-13).
  //
  // The Cloud Function grants premium for `currentPlan === 'legacyPremium'`.
  // The web resolver does not: that cohort is under 1/1000 users and is granted
  // manually on request (app repo: bl3_deferred_note.md). A future diff against
  // the function will read like an omission. It is the specified behavior, and
  // test/firebase-premium.test.ts pins it.
  if (plan !== 'monthly' && plan !== 'yearly') return false;

  // Never derive premium from `currentPlan` alone: it records the last plan
  // purchased and never downgrades (audit BL-2).
  const status = data.subscriptionStatus;
  if (status && ENTITLEMENT_ENDED_STATUSES.has(status)) return false;

  // An absent expiry is trusted as active — matching the function.
  const expiry = data.subscriptionExpiryDate;
  if (expiry && expiry.toMillis() <= now) return false;

  return true;
}
