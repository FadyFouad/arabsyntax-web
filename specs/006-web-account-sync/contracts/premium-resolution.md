# Contract: premium resolution on web

**Source of truth**: `arabsyntax` app repo, `functions/src/ai/handlers/explainVerse.ts`
`hasPremiumEntitlement()` (lines 160–182) + `ENTITLEMENT_ENDED_STATUSES` (lines 138–143);
`firestore.rules` lines 90–93 (`purchases/{uid}`: owner-read, client-write forbidden).
Audit ref: BL-2 / C-2. Locked decisions: D-4 (cosmetic only), D-5 (legacyPremium not resolved on web).

## Reference logic (deployed Cloud Function, verbatim)

```typescript
const ENTITLEMENT_ENDED_STATUSES = new Set(['expired', 'refunded', 'revoked', 'paused']);
// 'cancelled' deliberately ABSENT — auto-renew off still grants access until period end.

async function hasPremiumEntitlement(uid: string): Promise<boolean> {
  const purchaseDoc = await db.doc(`purchases/${uid}`).get();
  if (!purchaseDoc.exists) return false;
  const data = purchaseDoc.data()!;
  const plan = data.currentPlan as string | undefined;
  if (plan === 'lifetime' || plan === 'legacyPremium') return true;
  if (plan !== 'monthly' && plan !== 'yearly') return false;
  const status = data.subscriptionStatus;
  if (status && ENTITLEMENT_ENDED_STATUSES.has(status)) return false;
  const expiry = data.subscriptionExpiryDate;              // Firestore Timestamp | null
  if (expiry && expiry.toMillis() <= Date.now()) return false;
  return true;
}
```

## Web resolver — replicate exactly, with ONE intentional delta

> **⚠ Intentional delta (do not "fix")**: the function grants `currentPlan === 'legacyPremium'`;
> the **web resolver treats `legacyPremium` as free**. This is locked decision D-5 / FR-13
> (cohort <1/1000, manual grant on request — see bl3_deferred_note.md). Everything else is
> identical to the function.

Truth table (web):

| `currentPlan` | `subscriptionStatus` | `subscriptionExpiryDate` | Premium? |
|---|---|---|---|
| absent / doc missing | — | — | no |
| `lifetime` | any | any | **yes** |
| `legacyPremium` | any | any | **no** (delta, D-5) |
| anything else not monthly/yearly | — | — | no |
| `monthly`/`yearly` | `expired`\|`refunded`\|`revoked`\|`paused` | any | no |
| `monthly`/`yearly` | `cancelled` | future or absent | **yes** |
| `monthly`/`yearly` | null/absent/other | `<= now` | no |
| `monthly`/`yearly` | null/absent/other | future or absent | **yes** |

## Web obligations

- Read `purchases/{uid}` once per session (sign-in / page load with restored session); cache in the
  auth context. No realtime listener — the badge is cosmetic and gates nothing (D-4).
- Never derive premium from `currentPlan` alone (it never downgrades — BL-2).
- Never attempt to write `purchases/{uid}` (rules forbid it) and never read
  `users/{uid}/entitlements/**` (FR-13).
- Resolver is a pure function `resolvePremium(data: PurchaseDoc | undefined, now: number): boolean`
  — unit-tested against the full truth table above, including the legacyPremium delta row.
- Read failure (offline/permission) → resolve as free, silently (badge absence is the safe state).
