import { addNote, listNotes, validateNote, type Note } from '@/lib/notes';
import { getClientIp, getLimiter, getRedis, hashIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Public notes wall. Anyone can post (no sign-in), so every protection here
 * is invisible to real visitors: normalisation, link/reserved-name checks, a
 * honeypot, per-IP + global rate limits and OpenAI moderation (fail closed —
 * nothing unmoderated goes live). Upstream error text is logged, never sent.
 */
const LOAD_ERROR = "Couldn't load notes right now.";
const UNAVAILABLE = 'Notes are taking a break — try again later.';
const RATE_LIMITED = "You've left a few notes already — try again in a bit.";
const FLAGGED = "That note didn't pass the filter — try rewording it.";

const json = (body: unknown, status = 200) => Response.json(body, { status });

const makeNote = (name: string, text: string): Note => ({
  id: crypto.randomUUID(),
  name,
  text,
  createdAt: new Date().toISOString(),
});

export async function GET() {
  const redis = getRedis();
  if (!redis) return json({ notes: [], total: 0, offline: true });
  try {
    return json(await listNotes(redis));
  } catch (err) {
    console.error('[notes] list failed:', err);
    return json({ error: LOAD_ERROR }, 500);
  }
}

/** true = flagged, false = clean. Throws when moderation is unavailable. */
async function moderate(input: string): Promise<boolean> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'omni-moderation-latest', input }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok)
    throw new Error(`moderation HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { results?: { flagged?: boolean }[] };
  if (!data.results?.[0])
    throw new Error('moderation: unexpected response shape');
  return Boolean(data.results[0].flagged);
}

export async function POST(req: Request) {
  const redis = getRedis();
  const ipLimiter = getLimiter('notesIp');
  const globalLimiter = getLimiter('notesGlobal');
  if (!redis || !ipLimiter || !globalLimiter)
    return json({ error: UNAVAILABLE }, 503);

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('not an object');
    body = parsed;
  } catch {
    return json({ error: "That note couldn't be read — try again." }, 400);
  }

  const check = validateNote({ name: body.name, text: body.text });
  if (!check.ok) return json({ error: check.error }, 400);

  // Honeypot: bots that fill the hidden field get a normal-looking success and nothing is stored.
  if (typeof body.website === 'string' && body.website.trim()) {
    return json({ note: makeNote(check.name, check.text) }, 201);
  }

  try {
    const perIp = await ipLimiter.limit(hashIp(getClientIp(req)));
    if (perIp.reason === 'timeout') throw new Error('per-IP limiter timed out');
    if (!perIp.success) return json({ error: RATE_LIMITED }, 429);
    const global = await globalLimiter.limit('global');
    if (global.reason === 'timeout')
      throw new Error('global limiter timed out');
    if (!global.success) return json({ error: RATE_LIMITED }, 429);
  } catch (err) {
    console.error('[notes] rate limiter failed:', err);
    return json({ error: UNAVAILABLE }, 503);
  }

  try {
    if (await moderate(`${check.name}\n${check.text}`))
      return json({ error: FLAGGED }, 422);
  } catch (err) {
    console.error('[notes] moderation unavailable:', err);
    return json({ error: UNAVAILABLE }, 503);
  }

  const note = makeNote(check.name, check.text);
  try {
    await addNote(redis, note);
  } catch (err) {
    console.error('[notes] store failed:', err);
    return json({ error: UNAVAILABLE }, 503);
  }
  return json({ note }, 201);
}
