import { getFirestoreDb } from './client';
import { resolvePremium, type PurchaseDoc } from './contracts/premium';

/**
 * Premium badge source. Reads `purchases/{uid}` exactly once per session and
 * caches the answer in the auth context — no realtime listener, because the
 * badge is cosmetic and gates nothing (D-4).
 *
 * Contract + truth table: specs/006-web-account-sync/contracts/premium-resolution.md
 * Resolver: ./contracts/premium.ts (pure, unit-tested).
 */

export { resolvePremium, ENTITLEMENT_ENDED_STATUSES } from './contracts/premium';
export type { PurchaseDoc } from './contracts/premium';

/**
 * Any read failure — offline, rules denial, missing doc — resolves to free.
 * Absence of a badge is the safe state: showing one the user hasn't paid for is
 * worse than hiding one they have, and nothing is gated on the answer.
 */
export async function fetchIsPremium(uid: string): Promise<boolean> {
  try {
    const db = await getFirestoreDb();
    const { doc, getDoc } = await import('firebase/firestore');
    const snapshot = await getDoc(doc(db, 'purchases', uid));
    if (!snapshot.exists()) return false;
    return resolvePremium(snapshot.data() as PurchaseDoc, Date.now());
  } catch {
    return false;
  }
}
