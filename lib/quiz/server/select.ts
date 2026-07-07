import 'server-only';
import type { ClientQuestion, Question, TokenItem } from '../types';

/** How many questions a quiz draws (spec: a random set of 10). */
export const QUIZ_SIZE = 10;

type Rng = () => number;

/** In-place Fisher–Yates using the supplied RNG. Returns the same array. */
function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cleanHint(hint: unknown): string | undefined {
  return typeof hint === 'string' && hint.trim() ? hint : undefined;
}

/**
 * The lesson slug to expose for a question, or undefined. Attached only when the
 * id is a non-empty string AND (no predicate given, or the predicate confirms a
 * lesson page exists) — so the client can render a "review the lesson" link that
 * never dead-ends.
 */
function lessonSlug(id: unknown, hasLesson?: (slug: string) => boolean): string | undefined {
  if (typeof id !== 'string' || !id.trim()) return undefined;
  return !hasLesson || hasLesson(id) ? id : undefined;
}

/**
 * Draw up to {@link QUIZ_SIZE} questions from the pool and shuffle both the
 * question order and each question's options. Returns the browser-safe
 * {@link ClientQuestion}s (no correct answer) alongside the {@link TokenItem}s
 * (id + option permutation) that the signed token carries for grading.
 */
export function buildQuiz(
  pool: Question[],
  size: number = QUIZ_SIZE,
  rng: Rng = Math.random,
  hasLesson?: (slug: string) => boolean,
): { questions: ClientQuestion[]; items: TokenItem[] } {
  const picked = shuffle([...pool], rng).slice(0, size);
  const questions: ClientQuestion[] = [];
  const items: TokenItem[] = [];

  for (const q of picked) {
    // perm[presentedIndex] = originalIndex, so options are shown reordered while
    // the token can map a chosen presented index back to the original.
    const perm = shuffle(
      q.options.map((_, i) => i),
      rng,
    );
    questions.push({
      id: q.questionID,
      question: q.question,
      hint: cleanHint(q.hint),
      options: perm.map((i) => q.options[i]),
      lessonId: lessonSlug(q.lessonId, hasLesson),
    });
    items.push({ id: q.questionID, perm });
  }

  return { questions, items };
}
