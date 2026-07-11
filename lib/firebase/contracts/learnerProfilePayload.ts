/**
 * Pure payload builders for the post-sign-in learner profile form (feature 008).
 *
 * Writes exactly two new keys onto `users/{uid}` — `learnerProfile` (a map) and
 * `learnerProfileSkippedAt` — approved as the resolution of spec 006's C-5
 * escalation. Nothing else may be added here; the mobile app's reader ignores
 * unknown fields (audit SAFE-3) but the approval covers these two keys only.
 *
 * Like ./profilePayload.ts, the timestamp sentinel is INJECTED so this module
 * stays free of any `firebase/*` import and unit-testable without a network.
 */

export const LEARNER_GOALS = ['thanaweya', 'quran', 'language_improvement', 'general_interest'] as const;
export const LEARNER_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const SCHOOL_STAGES = ['sec_1', 'sec_2', 'sec_3'] as const;
export const LEARNER_SOURCES = ['search', 'app', 'social_media', 'friend', 'teacher', 'other'] as const;

export type LearnerGoal = (typeof LEARNER_GOALS)[number];
export type LearnerLevel = (typeof LEARNER_LEVELS)[number];
export type SchoolStage = (typeof SCHOOL_STAGES)[number];
export type LearnerSource = (typeof LEARNER_SOURCES)[number];

export interface LearnerProfileFormValues {
  goal: LearnerGoal | null;
  level: LearnerLevel | null;
  /** ISO 3166-1 alpha-2, e.g. 'EG'. */
  country: string | null;
  schoolStage: SchoolStage | null;
  source: LearnerSource | null;
  /** Free-text name input, shown only when the session carries no displayName. */
  name: string;
  /** `user.displayName` from the auth session at submit time. */
  currentDisplayName: string | null;
}

/**
 * The single submit payload. Every answer is optional; unanswered fields are
 * simply absent (C-1 null omission — a null under a merge write would be stored
 * as null, and an empty string is not a value the app should ever see).
 */
export function buildLearnerProfileSubmit<T>(
  values: LearnerProfileFormValues,
  serverTimestamp: () => T,
): Record<string, unknown> {
  const profile: Record<string, unknown> = {};

  if (values.goal) profile.goal = values.goal;
  if (values.level) profile.level = values.level;
  if (values.country) profile.country = values.country;
  // schoolStage only means something under the thanaweya goal. If the user
  // picked a stage and then moved the goal away, the stale stage is dropped
  // here rather than trusting the UI to have cleared it.
  if (values.goal === 'thanaweya' && values.schoolStage) profile.schoolStage = values.schoolStage;
  if (values.source) profile.source = values.source;
  profile.updatedAt = serverTimestamp();

  const payload: Record<string, unknown> = { learnerProfile: profile };

  // displayName special case (NOT part of learnerProfile): the web may set a
  // name ONLY when the session has none — Apple hands the name over on first
  // consent only, so an Apple user can reach this form nameless. An existing
  // name is never overwritten, and an empty input is never written.
  const name = values.name.trim();
  if (name && !values.currentDisplayName?.trim()) payload.displayName = name;

  return payload;
}

/** The single skip payload — the "asked and declined" marker. */
export function buildLearnerProfileSkip<T>(serverTimestamp: () => T): Record<string, unknown> {
  return { learnerProfileSkippedAt: serverTimestamp() };
}

/**
 * Show the form iff BOTH markers are absent from the `users/{uid}` snapshot —
 * key PRESENCE, not truthiness, matching how createdAt is probed. Both markers
 * live on the shared document, so completing or skipping on one device silences
 * the form on every other.
 */
export function shouldShowProfileForm(docData: Record<string, unknown> | undefined): boolean {
  if (!docData) return true;
  return !('learnerProfile' in docData) && !('learnerProfileSkippedAt' in docData);
}

/**
 * `fields_filled` for the `profile_form_completed` analytics event: the number
 * of answered profile questions. `updatedAt` is bookkeeping and the name is not
 * part of `learnerProfile`, so neither counts.
 */
export function countFilledFields(payload: Record<string, unknown>): number {
  const profile = (payload.learnerProfile ?? {}) as Record<string, unknown>;
  return Object.keys(profile).filter((key) => key !== 'updatedAt').length;
}
