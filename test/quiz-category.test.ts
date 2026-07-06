import { describe, it, expect } from 'vitest';
import { allStages, resolveCategory, UNSTAGED_KEY } from '@/lib/quiz/server/category';

describe('allStages', () => {
  it('lists the seven graded stages in catalogue order', () => {
    expect(allStages()).toEqual([
      'primary',
      'midOne',
      'midTwo',
      'midThree',
      'secondaryOne',
      'secondaryTwo',
      'secondaryThree',
    ]);
  });
});

describe('resolveCategory', () => {
  it('maps "all" to every stage plus the unstaged bucket', () => {
    expect(resolveCategory('all')).toEqual([...allStages(), UNSTAGED_KEY]);
  });

  it('maps a multi-year marhala id to its stages', () => {
    expect(resolveCategory('prep')).toEqual(['midOne', 'midTwo', 'midThree']);
    expect(resolveCategory('secondary')).toEqual([
      'secondaryOne',
      'secondaryTwo',
      'secondaryThree',
    ]);
  });

  it('maps a single stage key to itself', () => {
    expect(resolveCategory('primary')).toEqual(['primary']);
    expect(resolveCategory('midTwo')).toEqual(['midTwo']);
  });

  it('returns null for an unknown category', () => {
    expect(resolveCategory('bogus')).toBeNull();
    expect(resolveCategory('unstaged')).toBeNull(); // not a valid GET category
  });
});
