import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  BEST_KEY,
  FILTERS_KEY,
  parseBestScore,
  parseStoredFilters,
  recordScore,
  saveLastFilters,
} from '@/lib/quiz/storage';
import { DEFAULT_FILTERS } from '@/lib/quiz/marhala';

/** Minimal in-memory localStorage; `broken` makes every access throw. */
function makeStore(broken = false) {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => {
      if (broken) throw new Error('blocked');
      return map.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (broken) throw new Error('blocked');
      map.set(k, v);
    },
    _map: map,
  };
}

function installStore(broken = false) {
  const store = makeStore(broken);
  vi.stubGlobal('window', { localStorage: store });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseStoredFilters', () => {
  it('returns defaults for an empty or malformed string', () => {
    expect(parseStoredFilters('')).toEqual(DEFAULT_FILTERS);
    expect(parseStoredFilters('{not json')).toEqual(DEFAULT_FILTERS);
  });

  it('parses a full valid payload', () => {
    expect(parseStoredFilters(JSON.stringify({ marhala: 'prep', year: 'midTwo', difficulty: 'hard' }))).toEqual({
      marhala: 'prep',
      year: 'midTwo',
      difficulty: 'hard',
    });
  });

  it('fills missing/invalid fields with defaults', () => {
    expect(parseStoredFilters(JSON.stringify({ marhala: 'primary', difficulty: 'weird' }))).toEqual({
      marhala: 'primary',
      year: DEFAULT_FILTERS.year,
      difficulty: 'all',
    });
  });
});

describe('parseBestScore', () => {
  it('parses, clamps and rounds; null on empty or non-numeric', () => {
    expect(parseBestScore('')).toBeNull();
    expect(parseBestScore('abc')).toBeNull();
    expect(parseBestScore('85')).toBe(85);
    expect(parseBestScore('85.6')).toBe(86);
    expect(parseBestScore('150')).toBe(100);
    expect(parseBestScore('-5')).toBe(0);
  });
});

describe('saveLastFilters', () => {
  it('writes the filters as JSON', () => {
    const store = installStore();
    saveLastFilters({ marhala: 'prep', year: 'midOne', difficulty: 'easy' });
    expect(JSON.parse(store._map.get(FILTERS_KEY)!)).toEqual({
      marhala: 'prep',
      year: 'midOne',
      difficulty: 'easy',
    });
  });

  it('swallows a storage failure', () => {
    installStore(true);
    expect(() => saveLastFilters(DEFAULT_FILTERS)).not.toThrow();
  });
});

describe('recordScore', () => {
  it('stores the first score, then only improvements', () => {
    const store = installStore();
    expect(recordScore(50)).toBe(50);
    expect(store._map.get(BEST_KEY)).toBe('50');
    expect(recordScore(30)).toBe(50); // no regression
    expect(recordScore(90)).toBe(90);
    expect(store._map.get(BEST_KEY)).toBe('90');
  });

  it('rounds/clamps and tolerates a broken store', () => {
    installStore(true);
    // readRaw + setItem both throw → treated as no prior best, returns rounded.
    expect(recordScore(87.4)).toBe(87);
  });
});
