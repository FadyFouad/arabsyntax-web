import { describe, it, expect } from 'vitest';
import { scoreTier } from '@/lib/quiz/scoring';

describe('scoreTier', () => {
  it('maps each percentage band to its tier', () => {
    expect(scoreTier(100)).toBe('perfect');
    expect(scoreTier(90)).toBe('great');
    expect(scoreTier(80)).toBe('great');
    expect(scoreTier(79)).toBe('good');
    expect(scoreTier(50)).toBe('good');
    expect(scoreTier(49)).toBe('fair');
    expect(scoreTier(25)).toBe('fair');
    expect(scoreTier(24)).toBe('low');
    expect(scoreTier(0)).toBe('low');
  });
});
