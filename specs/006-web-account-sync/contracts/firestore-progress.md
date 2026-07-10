# Contract: `users/{uid}/progress/lesson_completion`

**Source of truth**: `arabsyntax` app repo, `lib/features/auth/data/firestore_progress_sync_repository.dart`
(read lines 15–93, `markLessonCompleted` 147–151, `mergeLessonCompletions` 254–267);
`firestore.rules` lines 20–22 (owner read/write). Audit ref: C-3.

## Document layout

`users/{uid}/progress/` contains four fixed doc ids: `lesson_completion`, `quiz_results`,
`streak_data`, `audio_positions`. **Web touches only `lesson_completion`** (FR-10).

`lesson_completion` fields:
- `completed`: map — key: slug `lessonId` (e.g. `elm_alnaho`); value: completion time as Firestore
  `Timestamp` **or** ISO-8601 string (both shipped historically; both platforms' readers accept both).
- `updatedAt`: server timestamp.

## Reference write (app steady-state, verbatim logic)

```dart
// markLessonCompleted — one write per completion event
docRef.set({
  'completed.$lessonId': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
}, SetOptions(merge: true));
```

Forbidden pattern (C-3): `writeAll`, which replaces the entire `completed` map.

## Web obligations

1. **Read (FR-7)**: fetch the single doc; parse `completed` keys, tolerating `Timestamp` and string
   values. The UI needs only the key set.
2. **Write one completion (FR-8)**: per-key merge targeting exactly `completed.<lessonId>` +
   `updatedAt`, both `serverTimestamp()`. One write per Mark-Complete press — no scroll/interaction
   writes, no debounce queue that could coalesce into a map replacement.
3. **JS SDK dot-path trap**: in the web SDK, `setDoc(..., {merge:true})` treats `'completed.x'` as
   a **literal field name**, not a path (unlike the Dart SDK pattern above). The web write MUST be:
   - `updateDoc(ref, { ['completed.' + lessonId]: serverTimestamp(), updatedAt: serverTimestamp() })`
     (updateDoc interprets dot paths correctly), and
   - on `not-found` (first-ever cloud write for this user), create via
     `setDoc(ref, { completed: { [lessonId]: serverTimestamp() }, updatedAt: serverTimestamp() }, { merge: true })`
     — nested-map merge is key-wise, so this is clobber-safe for the race where the app writes
     between the failed update and the create.
   Getting this wrong writes a top-level field literally named `"completed.elm_alnaho"` — the app
   would never see the completion. Covered by an emulator test asserting the resulting doc shape.
4. **Monotonic (FR-15)**: web never writes `false`, never uses `deleteField()`, never removes a key.
5. **Sign-in union merge (FR-16)**: compute `localSet − cloudKeys`; if non-empty, issue ONE
   `updateDoc` containing a `completed.<id>: serverTimestamp()` entry per missing id (+ `updatedAt`),
   falling back to the nested-map `setDoc` create as in (3). Then set local store to the union.
   Nothing is ever removed from either side.
6. **Scope (FR-10)**: `quiz_results`, `streak_data`, `audio_positions` — never read, never written.

## Failure handling

A failed completion write keeps the completion in localStorage; it is retried on the next sign-in
union merge at the latest (the union computation makes retries idempotent — re-writing an existing
key merely refreshes its timestamp, which the app treats as the same completion).
