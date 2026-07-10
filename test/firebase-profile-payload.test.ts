import { describe, it, expect } from 'vitest';
import {
  buildProfileUpsert,
  buildSignOutPayload,
  isFirstSignIn,
  FORBIDDEN_PROFILE_KEYS,
} from '@/lib/firebase/contracts/profilePayload';

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: specs/006-web-account-sync/contracts/firestore-user-doc.md
//
// `users/{uid}` is written by BOTH the mobile app and (now) the web. The app's
// reader hard-casts `createdAt`/`lastSignInAt` `as Timestamp?`, so writing an
// ISO string or a millis number permanently breaks the app's profile read for
// that user (audit BL-4). And because every web write is `{merge: true}`, a
// `displayName: null` in the payload would ERASE a name the app wrote — Apple
// only returns the name on first consent, so this is the common case, not a
// corner one.
//
// Those two facts are why the payload is built by a pure function with an
// injected timestamp sentinel: the truth table below is the whole contract, and
// it is checkable without a network or an emulator.
// ─────────────────────────────────────────────────────────────────────────────

/** Stand-in for `serverTimestamp()`; identity-compared, like the real sentinel. */
const SENTINEL = { __sentinel: 'serverTimestamp' } as const;
const stamp = () => SENTINEL;

const base = {
  email: 'user@example.com',
  displayName: 'Sara',
  provider: 'google' as const,
  docExists: true,
  hasCreatedAt: true,
};

describe('buildProfileUpsert — createdAt is written once, ever', () => {
  it('includes createdAt when the doc does not exist', () => {
    const payload = buildProfileUpsert({ ...base, docExists: false, hasCreatedAt: false }, stamp);
    expect(payload.createdAt).toBe(SENTINEL);
  });

  it('includes createdAt when the doc exists but lacks the field (app-side backfill)', () => {
    const payload = buildProfileUpsert({ ...base, docExists: true, hasCreatedAt: false }, stamp);
    expect(payload.createdAt).toBe(SENTINEL);
  });

  it('omits createdAt when the field is already present', () => {
    const payload = buildProfileUpsert({ ...base, docExists: true, hasCreatedAt: true }, stamp);
    expect(payload).not.toHaveProperty('createdAt');
  });

  it('treats a missing doc as authoritative even if hasCreatedAt is somehow true', () => {
    const payload = buildProfileUpsert({ ...base, docExists: false, hasCreatedAt: true }, stamp);
    expect(payload.createdAt).toBe(SENTINEL);
  });
});

describe('buildProfileUpsert — null omission (C-1)', () => {
  it('omits displayName when null, so a merge write cannot erase an app-written name', () => {
    const payload = buildProfileUpsert({ ...base, displayName: null }, stamp);
    expect(payload).not.toHaveProperty('displayName');
  });

  it('omits displayName when it is an empty string', () => {
    const payload = buildProfileUpsert({ ...base, displayName: '' }, stamp);
    expect(payload).not.toHaveProperty('displayName');
  });

  it('includes displayName when Apple supplies it on first consent', () => {
    const payload = buildProfileUpsert({ ...base, provider: 'apple', displayName: 'Sara' }, stamp);
    expect(payload.displayName).toBe('Sara');
  });

  it('omits email when null (Apple private relay can withhold it)', () => {
    const payload = buildProfileUpsert({ ...base, email: null }, stamp);
    expect(payload).not.toHaveProperty('email');
  });

  it('never emits an explicit null for any key', () => {
    const payload = buildProfileUpsert(
      { email: null, displayName: null, provider: 'apple', docExists: false, hasCreatedAt: false },
      stamp,
    );
    expect(Object.values(payload)).not.toContain(null);
    expect(Object.values(payload)).not.toContain(undefined);
  });
});

describe('buildProfileUpsert — full truth table (name × doc × createdAt)', () => {
  const names: Array<string | null> = ['Sara', null];
  const docs = [true, false];
  const created = [true, false];

  for (const displayName of names) {
    for (const docExists of docs) {
      for (const hasCreatedAt of created) {
        const label = `name=${displayName ?? 'null'} docExists=${docExists} hasCreatedAt=${hasCreatedAt}`;

        it(`${label} → correct keys, sentinels, and no forbidden fields`, () => {
          const payload = buildProfileUpsert(
            { ...base, displayName, docExists, hasCreatedAt },
            stamp,
          );

          // Always written.
          expect(payload.provider).toBe('google');
          expect(payload.email).toBe('user@example.com');
          expect(payload.lastSignInAt).toBe(SENTINEL);

          // Conditionally written.
          expect('displayName' in payload).toBe(displayName !== null);
          expect('createdAt' in payload).toBe(!docExists || !hasCreatedAt);

          // Server-owned keys would make the rules reject the whole upsert.
          for (const forbidden of FORBIDDEN_PROFILE_KEYS) {
            expect(payload).not.toHaveProperty(forbidden);
          }
        });
      }
    }
  }
});

describe('buildProfileUpsert — provider marker', () => {
  it.each(['google', 'apple'] as const)('writes %s lowercase, matching the app enum', (provider) => {
    expect(buildProfileUpsert({ ...base, provider }, stamp).provider).toBe(provider);
  });

  it('writes exactly the five contract keys and nothing else', () => {
    const payload = buildProfileUpsert({ ...base, docExists: false, hasCreatedAt: false }, stamp);
    expect(Object.keys(payload).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'lastSignInAt',
      'provider',
    ]);
  });
});

describe('buildSignOutPayload', () => {
  it('writes only lastSignOutAt, as a sentinel (mirrors the app)', () => {
    const payload = buildSignOutPayload(stamp);
    expect(payload).toEqual({ lastSignOutAt: SENTINEL });
  });
});

describe('isFirstSignIn — the `sign_up` analytics trigger', () => {
  it('is true exactly when the payload set createdAt', () => {
    const first = buildProfileUpsert({ ...base, docExists: false, hasCreatedAt: false }, stamp);
    const returning = buildProfileUpsert({ ...base, docExists: true, hasCreatedAt: true }, stamp);
    expect(isFirstSignIn(first)).toBe(true);
    expect(isFirstSignIn(returning)).toBe(false);
  });
});
