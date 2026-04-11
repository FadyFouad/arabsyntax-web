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
): Promise<{ success: boolean }> {
  if (!ratelimit) {
    // Local dev fallback
    return { success: true };
  }
  
  try {
    const { success } = await ratelimit.limit(`contact:${ip}`);
    return { success };
  } catch (error) {
    // If Upstash fails, fallback to allow if Redis is down.
    console.error('Rate limit error:', error);
    return { success: true }; 
  }
}