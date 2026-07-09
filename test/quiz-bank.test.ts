import { describe, it, expect, beforeEach, vi } from 'vitest';

// bank.ts opens with `import 'server-only'`, which throws outside React.
vi.mock('server-only', () => ({}));

// Mutable virtual filesystem, shared with the hoisted node:fs mock.
const store = vi.hoisted(() => ({ files: {} as Record<string, string> }));

vi.mock('node:fs', () => ({
  readFileSync: (p: string) => {
    const base = String(p).split(/[\\/]/).pop() as string;
    const v = store.files[base];
    if (v === '__THROW__') throw new Error('boom');
    if (v === undefined) throw new Error(`ENOENT ${base}`);
    return v;
  },
}));

import {
  getLessonQuestionCount,
  getPool,
  getQuestionById,
  _resetBankCache,
} from '@/lib/quiz/server/bank';

const valid = (over: Record<string, unknown> = {}) => ({
  questionID: 'p1',
  question: 'q',
  options: ['a', 'b', 'c'],
  correctIndex: 1,
  ...over,
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  store.files = {
    'manifest.json': JSON.stringify(['primary.json', 'midOne.json', 'broken.json', 'unstaged.json']),
    'primary.json': JSON.stringify([
      valid({ questionID: 'p1', difficulty: 'easy', lessonId: 'almobtada' }),
      valid({ questionID: 'p2', difficulty: 'hard', options: ['a', 'b'], correctIndex: 0, lessonId: 7 }),
      null,
      { question: 'q', options: ['a', 'b'], correctIndex: 0 }, // no questionID
      { questionID: 'x', options: ['a', 'b'], correctIndex: 0 }, // no question
      { questionID: 'x', question: 'q', options: 'nope', correctIndex: 0 }, // options not array
      { questionID: 'x', question: 'q', options: ['a'], correctIndex: 0 }, // <2
      { questionID: 'x', question: 'q', options: ['a', 1], correctIndex: 0 }, // non-string option
      { questionID: 'x', question: 'q', options: ['a', 'b'], correctIndex: 'z' }, // bad index type
      { questionID: 'x', question: 'q', options: ['a', 'b'], correctIndex: 5 }, // out of range
      { questionID: 'x', question: 'q', options: ['a', 'b'], correctIndex: -1 }, // negative
    ]),
    'midOne.json': JSON.stringify([valid({ questionID: 'm1', lessonId: 'almobtada' })]),
    'broken.json': '__THROW__',
    'unstaged.json': JSON.stringify({ not: 'an array' }),
  };
  _resetBankCache();
});

describe('getPool', () => {
  it('keeps only valid questions and filters by difficulty', () => {
    expect(getPool(['primary'], 'all').map((q) => q.questionID)).toEqual(['p1', 'p2']);
    expect(getPool(['primary'], 'easy').map((q) => q.questionID)).toEqual(['p1']);
  });

  it('de-duplicates stage keys and ignores unknown ones', () => {
    expect(getPool(['primary', 'primary'], 'all')).toHaveLength(2);
    expect(getPool(['does-not-exist'], 'all')).toEqual([]);
  });

  it('narrows to one lesson when a slug is given', () => {
    expect(getPool(['primary', 'midOne'], 'all', 'almobtada').map((q) => q.questionID)).toEqual([
      'p1',
      'm1',
    ]);
    expect(getPool(['primary'], 'hard', 'almobtada')).toEqual([]); // filters compose
    expect(getPool(['primary'], 'all', 'no-such-lesson')).toEqual([]);
  });

  it('treats a non-array file body as empty and skips a file that fails to read', () => {
    expect(getPool(['unstaged'], 'all')).toEqual([]); // non-array body
    expect(getPool(['broken'], 'all')).toEqual([]); // read threw → stage absent
    expect(console.error).toHaveBeenCalled();
  });
});

describe('getQuestionById', () => {
  it('finds a valid question and returns undefined otherwise', () => {
    expect(getQuestionById('m1')?.questionID).toBe('m1');
    expect(getQuestionById('nope')).toBeUndefined();
  });
});

describe('getLessonQuestionCount', () => {
  it('counts questions per lesson slug, ignoring non-string/empty lessonIds', () => {
    expect(getLessonQuestionCount('almobtada')).toBe(2); // p1 + m1; p2 has a numeric lessonId
    expect(getLessonQuestionCount('no-such-lesson')).toBe(0);
  });
});

describe('bank cache', () => {
  it('caches until reset', () => {
    expect(getPool(['midOne'], 'all')).toHaveLength(1);
    store.files['midOne.json'] = JSON.stringify([]); // change underneath
    expect(getPool(['midOne'], 'all')).toHaveLength(1); // still cached
    _resetBankCache();
    expect(getPool(['midOne'], 'all')).toHaveLength(0); // re-read
  });
});
