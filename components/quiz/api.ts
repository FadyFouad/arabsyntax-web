import type { Difficulty, GradeResult, QuizPayload } from '@/lib/quiz/types';

/**
 * Thin client for the quiz API. The browser only ever sees questions with the
 * correct answer stripped (GET) and the graded result (POST) — the bank and the
 * answers stay on the server.
 */

export async function fetchQuiz(
  category: string,
  difficulty: Difficulty | 'all',
  lesson?: string,
): Promise<QuizPayload> {
  const params = new URLSearchParams();
  if (difficulty !== 'all') params.set('difficulty', difficulty);
  if (lesson) params.set('lesson', lesson);
  const qs = params.size > 0 ? `?${params}` : '';
  const res = await fetch(`/api/quiz/${encodeURIComponent(category)}${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`quiz fetch failed: ${res.status}`);
  return res.json();
}

export async function submitQuiz(
  category: string,
  token: string,
  answers: (number | null)[],
): Promise<GradeResult> {
  const res = await fetch(`/api/quiz/${encodeURIComponent(category)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, answers }),
  });
  if (!res.ok) throw new Error(`quiz submit failed: ${res.status}`);
  return res.json();
}
