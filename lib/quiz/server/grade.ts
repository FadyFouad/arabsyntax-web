import 'server-only';
import { getQuestionById } from './bank';
import type { GradeResult, Question, QuestionResult, TokenItem } from '../types';

type Resolver = (id: string) => Question | undefined;

/**
 * Grade a submission entirely server-side. For each token item we re-load the
 * question from the bank, translate the user's presented option index back to
 * the original via the permutation, and compare to the true `correctIndex`.
 * `correctIndex` in each result is the correct option's PRESENTED position, so
 * the client (which already holds the shuffled options) can show corrections —
 * revealed only now, after the answers were committed.
 */
export function gradeSubmission(
  items: TokenItem[],
  answers: (number | null)[],
  resolve: Resolver = getQuestionById,
): GradeResult {
  let score = 0;
  const results: QuestionResult[] = items.map((item, i) => {
    const question = resolve(item.id);
    const correctIndex = question ? item.perm.indexOf(question.correctIndex) : -1;
    const chosen = answers[i];
    const correct =
      question != null && chosen != null && item.perm[chosen] === question.correctIndex;
    if (correct) score += 1;
    return { questionId: item.id, correct, correctIndex };
  });

  return { score, total: items.length, results };
}
