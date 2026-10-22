/* ---------------- shared Redis + rate limiters ----------------
 * One Upstash Redis client (or null when the env vars are missing) and the
 * named sliding-window limiters used by the chat, notes and draft routes.
 * Raw IPs are never stored: only their SHA-256 hash is used as a key.
 *
 * Failure policy:
 * - chat: fails OPEN (a Redis blip must not take the chat down), and falls
 *   back to the in-memory limiter when Redis isn't configured at all.
 * - notes / draft: fail CLOSED. The callers turn a thrown error or a
 *   `reason: 'timeout'` result into a 503.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/* In-memory per-IP sliding window: the no-Redis fallback for the chat.
 * It resets per serverless instance, so it only stops a bored visitor. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

export function memoryRateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

type LimiterName = 'chat' | 'notesIp' | 'notesGlobal' | 'draft';

const LIMITERS: Record<
  LimiterName,
  {
    limiter: ReturnType<typeof Ratelimit.slidingWindow>;
    prefix: string;
    failOpen: boolean;
  }
> = {
  chat: {
    limiter: Ratelimit.slidingWindow(MAX_PER_WINDOW, '1 m'),
    prefix: 'rl:chat',
    failOpen: true,
  },
  notesIp: {
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:notes:ip',
    failOpen: false,
  },
  notesGlobal: {
    limiter: Ratelimit.slidingWindow(200, '1 d'),
    prefix: 'rl:notes:global',
    failOpen: false,
  },
  draft: {
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:draft',
    failOpen: false,
  },
};

const limiters = new Map<LimiterName, Ratelimit>();

export function getLimiter(name: LimiterName): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;
  let rl = limiters.get(name);
  if (!rl) {
    const { limiter, prefix, failOpen } = LIMITERS[name];
    // timeout 0 disables the library's "allow on timeout" behaviour for fail-closed limiters.
    rl = new Ratelimit({
      redis: client,
      limiter,
      prefix,
      timeout: failOpen ? 5000 : 0,
      analytics: false,
    });
    limiters.set(name, rl);
  }
  return rl;
}

/** Chat limiter: Upstash when configured, in-memory otherwise; fails open on Redis errors. */
export async function chatRateLimited(ip: string): Promise<boolean> {
  const limiter = getLimiter('chat');
  if (!limiter) return memoryRateLimited(ip);
  try {
    const { success } = await limiter.limit(hashIp(ip));
    return !success;
  } catch (err) {
    console.error('[ratelimit] chat limiter failed open:', err);
    return false;
  }
}
