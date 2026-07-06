import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiter for the quiz API, separate from the contact-form limiter so the
 * two don't share a budget. Reuses the same Upstash config; when it's not set
 * (local dev) requests pass through unthrottled. A generous sliding window —
 * quizzes are played far more often than the contact form is used — that still
 * slows automated harvesting of the bank across many submits.
 */

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, '10 m'),
    analytics: true,
  });
}

export async function checkQuizRateLimit(
  ip: string,
  action: string,
): Promise<{ success: boolean; unavailable?: boolean }> {
  if (!ratelimit) return { success: true };

  try {
    const { success } = await ratelimit.limit(`quiz:${action}:${ip}`);
    return { success };
  } catch (error) {
    // Configured but the check failed: fail closed rather than allow unbounded.
    console.error('Quiz rate limit error:', error);
    return { success: false, unavailable: true };
  }
}
