import { pickClientIp } from '@/lib/clientIp';
import { verifyToken } from '@/lib/quiz/server/token';
import { gradeSubmission } from '@/lib/quiz/server/grade';
import { checkQuizRateLimit } from '@/lib/quiz/server/ratelimit';

// Grading is per request and never cached.
export const dynamic = 'force-dynamic';

function noStore(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * POST /api/quiz/[id]/submit  body: { token, answers: (number|null)[] }
 *
 * Grades the answers entirely server-side from the signed token (which carries
 * the question ids + option permutation, not the answers) and returns the score
 * plus per-question outcomes. Rate-limited to slow automated harvesting.
 */
export async function POST(request: Request) {
  const ip = pickClientIp(request.headers);
  const rl = await checkQuizRateLimit(ip, 'submit');
  if (!rl.success) return noStore({ error: 'rate_limited' }, 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore({ error: 'bad_request' }, 400);
  }

  const { token, answers } = (body ?? {}) as { token?: unknown; answers?: unknown };
  if (typeof token !== 'string' || !Array.isArray(answers)) {
    return noStore({ error: 'bad_request' }, 400);
  }

  const items = await verifyToken(token);
  if (!items) return noStore({ error: 'invalid_token' }, 400);
  if (items.length !== answers.length) return noStore({ error: 'length_mismatch' }, 400);

  // Coerce each answer to a valid option index or null (unanswered / malformed).
  const normalized = answers.map((a) =>
    typeof a === 'number' && Number.isInteger(a) && a >= 0 ? a : null,
  );

  return noStore(gradeSubmission(items, normalized));
}
