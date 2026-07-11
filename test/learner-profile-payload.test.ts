import { describe, expect, it } from 'vitest';
import {
  buildLearnerProfileSkip,
  buildLearnerProfileSubmit,
  countFilledFields,
  shouldShowProfileForm,
  type LearnerProfileFormValues,
} from '@/lib/firebase/contracts/learnerProfilePayload';

// Feature 008 (post-sign-in profile form) — the two approved schema additions
// to users/{uid} and the C-1 rules they inherit: merge-only payloads, injected
// server timestamps, and null/empty omission.

const SENTINEL = 'SERVER_TS' as const;
const ts = () => SENTINEL;

const empty: LearnerProfileFormValues = {
  goal: null,
  level: null,
  country: null,
  schoolStage: null,
  source: null,
  name: '',
  currentDisplayName: 'Sara',
};

describe('buildLearnerProfileSubmit', () => {
  it('writes every answered field under learnerProfile, plus updatedAt', () => {
    const payload = buildLearnerProfileSubmit(
      {
        goal: 'thanaweya',
        level: 'beginner',
        country: 'EG',
        schoolStage: 'sec_3',
        source: 'teacher',
        name: '',
        currentDisplayName: 'Sara',
      },
      ts,
    );

    expect(payload).toEqual({
      learnerProfile: {
        goal: 'thanaweya',
        level: 'beginner',
        country: 'EG',
        schoolStage: 'sec_3',
        source: 'teacher',
        updatedAt: SENTINEL,
      },
    });
  });

  it('omits unanswered fields entirely — never null, never empty string', () => {
    const payload = buildLearnerProfileSubmit({ ...empty, goal: 'quran' }, ts);

    expect(payload).toEqual({
      learnerProfile: { goal: 'quran', updatedAt: SENTINEL },
    });
    expect(Object.values(payload.learnerProfile as object)).not.toContain(null);
  });

  it('an all-empty submit still stamps updatedAt (the "asked and answered nothing" marker)', () => {
    expect(buildLearnerProfileSubmit(empty, ts)).toEqual({
      learnerProfile: { updatedAt: SENTINEL },
    });
  });

  it('drops schoolStage when the goal is not thanaweya', () => {
    const payload = buildLearnerProfileSubmit(
      { ...empty, goal: 'quran', schoolStage: 'sec_1' },
      ts,
    );
    expect(payload.learnerProfile).not.toHaveProperty('schoolStage');
  });

  it('drops schoolStage when no goal was picked at all', () => {
    const payload = buildLearnerProfileSubmit({ ...empty, schoolStage: 'sec_1' }, ts);
    expect(payload.learnerProfile).not.toHaveProperty('schoolStage');
  });

  describe('displayName special case (top-level, not inside learnerProfile)', () => {
    it('writes a provided name when the session has none (the Apple case)', () => {
      const payload = buildLearnerProfileSubmit(
        { ...empty, name: ' عمر ', currentDisplayName: null },
        ts,
      );
      expect(payload.displayName).toBe('عمر');
      expect(payload.learnerProfile).not.toHaveProperty('displayName');
    });

    it('treats a whitespace-only session name as absent', () => {
      const payload = buildLearnerProfileSubmit(
        { ...empty, name: 'Omar', currentDisplayName: '  ' },
        ts,
      );
      expect(payload.displayName).toBe('Omar');
    });

    it('never overwrites an existing session name', () => {
      const payload = buildLearnerProfileSubmit(
        { ...empty, name: 'Impostor', currentDisplayName: 'Sara' },
        ts,
      );
      expect(payload).not.toHaveProperty('displayName');
    });

    it('omits the key when the input is empty or whitespace — never null or ""', () => {
      for (const name of ['', '   ']) {
        const payload = buildLearnerProfileSubmit({ ...empty, name, currentDisplayName: null }, ts);
        expect(payload).not.toHaveProperty('displayName');
      }
    });
  });
});

describe('buildLearnerProfileSkip', () => {
  it('is exactly the one skip marker with a server timestamp', () => {
    expect(buildLearnerProfileSkip(ts)).toEqual({ learnerProfileSkippedAt: SENTINEL });
  });
});

describe('shouldShowProfileForm', () => {
  it('shows for a missing document', () => {
    expect(shouldShowProfileForm(undefined)).toBe(true);
  });

  it('shows for a document with neither marker (e.g. app-created profile)', () => {
    expect(shouldShowProfileForm({ displayName: 'Sara', createdAt: 'x' })).toBe(true);
  });

  it('never shows again after completion', () => {
    expect(shouldShowProfileForm({ learnerProfile: { goal: 'quran' } })).toBe(false);
  });

  it('never shows again after a skip', () => {
    expect(shouldShowProfileForm({ learnerProfileSkippedAt: 'x' })).toBe(false);
  });

  it('checks key PRESENCE, not truthiness — a null marker still counts as "asked"', () => {
    expect(shouldShowProfileForm({ learnerProfile: null })).toBe(false);
    expect(shouldShowProfileForm({ learnerProfileSkippedAt: null })).toBe(false);
  });
});

describe('countFilledFields', () => {
  it('counts answered questions, excluding updatedAt', () => {
    const payload = buildLearnerProfileSubmit(
      { ...empty, goal: 'thanaweya', schoolStage: 'sec_2', country: 'SA' },
      ts,
    );
    expect(countFilledFields(payload)).toBe(3);
  });

  it('is 0 for an all-empty submit', () => {
    expect(countFilledFields(buildLearnerProfileSubmit(empty, ts))).toBe(0);
  });

  it('does not count the displayName special case', () => {
    const payload = buildLearnerProfileSubmit(
      { ...empty, name: 'Omar', currentDisplayName: null },
      ts,
    );
    expect(countFilledFields(payload)).toBe(0);
  });

  it('tolerates a payload with no learnerProfile map', () => {
    expect(countFilledFields({})).toBe(0);
  });
});
