import { describe, it, expect, vi } from 'vitest';

// select.ts opens with `import 'server-only'`, which throws outside React.
vi.mock('server-only', () => ({}));

import { buildQuiz, QUIZ_SIZE } from '@/lib/quiz/server/select';
import type { Question } from '@/lib/quiz/types';

const q = (over: Partial<Question> = {}): Question => ({
  questionID: '0001',
  question: 'س؟',
  options: ['أ', 'ب', 'ج', 'د'],
  correctIndex: 1,
  ...over,
});

describe('buildQuiz', () => {
  it('caps the draw at QUIZ_SIZE and never leaks the correct answer', () => {
    const pool = Array.from({ length: 25 }, (_, i) => q({ questionID: String(i) }));
    const { questions, items } = buildQuiz(pool);
    expect(questions).toHaveLength(QUIZ_SIZE);
    expect(items).toHaveLength(QUIZ_SIZE);
    // ClientQuestion must not carry a correct-answer field (in the object or,
    // crucially, once serialised to the wire).
    for (const cq of questions) {
      expect(cq).not.toHaveProperty('correctIndex');
      expect(JSON.stringify(cq)).not.toMatch(/correctIndex/);
    }
  });

  it('uses the whole pool when it is smaller than the size', () => {
    const pool = [q({ questionID: 'a' }), q({ questionID: 'b' })];
    const { questions } = buildQuiz(pool, QUIZ_SIZE, () => 0);
    expect(questions).toHaveLength(2);
  });

  it('shuffles options with a permutation that maps back to the originals', () => {
    const source = q({ questionID: 'x', options: ['w', 'x', 'y', 'z'], correctIndex: 2 });
    const { questions, items } = buildQuiz([source], QUIZ_SIZE, () => 0);
    const [cq] = questions;
    const [item] = items;
    // presented option j is the original option at perm[j].
    item.perm.forEach((orig, presented) => {
      expect(cq.options[presented]).toBe(source.options[orig]);
    });
    // and every original option is present exactly once.
    expect([...cq.options].sort()).toEqual([...source.options].sort());
  });

  it('drops a blank hint and keeps a real one', () => {
    expect(buildQuiz([q({ hint: 'تلميح' })], 1, () => 0).questions[0].hint).toBe('تلميح');
    expect(buildQuiz([q({ hint: '  ' })], 1, () => 0).questions[0].hint).toBeUndefined();
  });

  it('exposes lessonId only when the predicate confirms a lesson page exists', () => {
    const has = (slug: string) => slug === 'alesm';
    expect(buildQuiz([q({ lessonId: 'alesm' })], 1, () => 0, has).questions[0].lessonId).toBe('alesm');
    // id with no lesson page → stripped, so the review link never dead-ends.
    expect(
      buildQuiz([q({ lessonId: 'oslop_alekhtesas' })], 1, () => 0, has).questions[0].lessonId,
    ).toBeUndefined();
    // missing/blank id → undefined.
    expect(buildQuiz([q({ lessonId: '  ' })], 1, () => 0, has).questions[0].lessonId).toBeUndefined();
    expect(buildQuiz([q()], 1, () => 0, has).questions[0].lessonId).toBeUndefined();
  });
});
