import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
  });
}

export async function checkRateLimit(
  ip: string
): Promise<{ success: boolean; unavailable?: boolean }> {
  if (!ratelimit) {
    // Upstash not configured (e.g. local dev): allow through unthrottled.
    return { success: true };
  }

  try {
    const { success } = await ratelimit.limit(`contact:${ip}`);
    return { success };
  } catch (error) {
    // Upstash is configured but the check failed. Fail closed: we can't
    // verify the limit, so reject rather than allow unbounded submissions.
    console.error('Rate limit error:', error);
    return { success: false, unavailable: true };
  }
}
