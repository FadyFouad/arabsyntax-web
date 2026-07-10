# Contract: `users/{uid}` profile writes

**Source of truth**: `arabsyntax` app repo, `lib/features/auth/data/firestore_user_profile_repository.dart`
(sign-in upsert lines 22–36, reader lines 79–95); `firestore.rules` lines 5–18. Audit ref: BL-4 / C-1.

## Reference behavior (app, verbatim logic)

```dart
final docRef = _firestore.collection('users').doc(uid);
final docSnapshot = await docRef.get();

final data = <String, dynamic>{
  'email': email,
  'displayName': displayName,
  'provider': provider.value,            // 'google' | 'apple' (lowercase)
  'lastSignInAt': FieldValue.serverTimestamp(),
};

if (!docSnapshot.exists || !docSnapshot.data()!.containsKey('createdAt')) {
  data['createdAt'] = FieldValue.serverTimestamp();
}

await docRef.set(data, SetOptions(merge: true));
```

On sign-out the app writes `{'lastSignOutAt': FieldValue.serverTimestamp()}` (merge).

## Web obligations

1. **Merge-only**: every write is `setDoc(ref, payload, { merge: true })`. Full-document `setDoc`
   without merge is forbidden.
2. **createdAt read-before-write**: `getDoc` first; include `createdAt: serverTimestamp()` only if
   the doc is missing or lacks the field. Never overwrite an existing `createdAt`.
3. **Timestamps are sentinels**: `createdAt`, `lastSignInAt`, `lastSignOutAt` MUST be
   `serverTimestamp()`. The app reader hard-casts `as Timestamp?` — an ISO string or millis value
   permanently breaks the app's profile read for that user.
4. **Null-omission**: build the payload with a pure builder that omits null/undefined fields.
   Apple returns `displayName` only on first consent — on later sign-ins the field is simply
   absent from the payload, so an app-written (or first-consent) name survives. If Apple provides
   a name on first consent, include it then.
5. **provider**: exactly `'google'` or `'apple'` (lowercase), last-used semantics only. Any
   "signed in with…" UI reads `auth.currentUser.providerData`, not this field (C-4).
6. **Forbidden fields**: never include `reengagementPushCount` or `lastReengagementPushAt` — the
   rules reject any write whose affected keys include them (which would fail the whole sign-in
   upsert).
7. **Failure handling**: a failed upsert leaves the user signed in; retry on next auth-state
   resolution. Never write a partial payload that violates rules 1–6 to "make progress".

## Web payload builder signature (pure, unit-tested)

```ts
buildProfileUpsert(input: {
  email: string | null; displayName: string | null; provider: 'google' | 'apple';
  docExists: boolean; hasCreatedAt: boolean;
}): Record<string, unknown>  // values may be serverTimestamp() sentinels
```

Truth-table tests: name present/absent × doc new/existing × createdAt present/absent.
