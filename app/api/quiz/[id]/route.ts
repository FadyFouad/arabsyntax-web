import { pickClientIp } from '@/lib/clientIp';
import { resolveCategory } from '@/lib/quiz/server/category';
import { getPool } from '@/lib/quiz/server/bank';
import { buildQuiz } from '@/lib/quiz/server/select';
import { isLessonSlug } from '@/lib/lessons/loader';
import { signToken } from '@/lib/quiz/server/token';
import { checkQuizRateLimit } from '@/lib/quiz/server/ratelimit';
import type { Difficulty, QuizPayload } from '@/lib/quiz/types';

// Dynamic per request: each call draws a fresh, shuffled set. Never prerender or
// cache — the whole point is that the bank stays server-side.
export const dynamic = 'force-dynamic';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function noStore(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * GET /api/quiz/[id]?difficulty=easy|medium|hard&lesson=<slug>
 *
 * Returns up to 10 questions for the category, with options pre-shuffled and the
 * correct answer STRIPPED, plus a signed token used to grade the submission. The
 * question bank never leaves the server. An optional `lesson` narrows the draw
 * to questions testing that lesson (the per-lesson "اختبر نفسك" action).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = pickClientIp(request.headers);
  const rl = await checkQuizRateLimit(ip, 'get');
  if (!rl.success) return noStore({ error: 'rate_limited' }, 429);

  const { id } = await params;
  const stageKeys = resolveCategory(id);
  if (!stageKeys) return noStore({ error: 'unknown_category' }, 404);

  const searchParams = new URL(request.url).searchParams;
  const difficultyParam = searchParams.get('difficulty');
  const difficulty: Difficulty | 'all' = DIFFICULTIES.includes(difficultyParam as Difficulty)
    ? (difficultyParam as Difficulty)
    : 'all';

  const lessonParam = searchParams.get('lesson');
  if (lessonParam !== null && !isLessonSlug(lessonParam)) {
    return noStore({ error: 'unknown_lesson' }, 404);
  }

  const pool = getPool(stageKeys, difficulty, lessonParam ?? undefined);
  if (pool.length === 0) {
    const empty: QuizPayload = { token: '', questions: [] };
    return noStore(empty);
  }

  const { questions, items } = buildQuiz(pool, undefined, undefined, isLessonSlug);
  const token = await signToken(items);
  const payload: QuizPayload = { token, questions };
  return noStore(payload);
}
