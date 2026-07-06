/** Tiered encouragement keyed off the final percentage. */
export type ScoreTier = 'perfect' | 'great' | 'good' | 'fair' | 'low';

export function scoreTier(percent: number): ScoreTier {
  if (percent >= 100) return 'perfect';
  if (percent >= 80) return 'great';
  if (percent >= 50) return 'good';
  if (percent >= 25) return 'fair';
  return 'low';
}
