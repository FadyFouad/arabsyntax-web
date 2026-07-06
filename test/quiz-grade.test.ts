import { describe, it, expect, vi } from 'vitest';

// grade.ts imports bank.ts, which opens with `import 'server-only'`.
vi.mock('server-only', () => ({}));

import { gradeSubmission } from '@/lib/quiz/server/grade';
import type { Question, TokenItem } from '@/lib/quiz/types';

const q = (id: string, correctIndex: number): Question => ({
  questionID: id,
  question: 'س؟',
  options: ['أ', 'ب', 'ج'],
  correctIndex,
});

const bank: Record<string, Question> = {
  q1: q('q1', 0), // original correct index 0
  q2: q('q2', 2), // original correct index 2
};
const resolve = (id: string) => bank[id];

describe('gradeSubmission', () => {
  it('grades against the original answer via the permutation', () => {
    const items: TokenItem[] = [
      { id: 'q1', perm: [2, 0, 1] }, // original 0 is shown at presented index 1
      { id: 'q2', perm: [0, 1, 2] }, // original 2 is shown at presented index 2
    ];
    const result = gradeSubmission(items, [1, 2], resolve);
    expect(result).toEqual({
      score: 2,
      total: 2,
      results: [
        { questionId: 'q1', correct: true, correctIndex: 1 },
        { questionId: 'q2', correct: true, correctIndex: 2 },
      ],
    });
  });

  it('marks wrong, unanswered, out-of-range, and missing questions correctly', () => {
    const items: TokenItem[] = [
      { id: 'q1', perm: [0, 1, 2] }, // original correct 0 → presented index 0
      { id: 'q2', perm: [2, 1, 0] }, // original correct 2 → presented index 0
      { id: 'gone', perm: [0, 1] }, // not in bank
    ];
    //          wrong pick   unanswered   out-of-range on missing q
    const result = gradeSubmission(items, [1, null, 9], resolve);
    expect(result.score).toBe(0);
    expect(result.results).toEqual([
      { questionId: 'q1', correct: false, correctIndex: 0 },
      { questionId: 'q2', correct: false, correctIndex: 0 },
      { questionId: 'gone', correct: false, correctIndex: -1 },
    ]);
  });
});
