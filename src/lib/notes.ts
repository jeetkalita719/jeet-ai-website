/* ---------------- visitor notes wall ----------------
 * Pure validation rules (shared by the composer and /api/notes, so the
 * character counter and the server always agree) plus the Redis list store.
 * Redis is imported type-only: the client gets passed in, which keeps this
 * file safe to import from client components.
 */
import type { Redis } from '@upstash/redis';

export type Note = {
  id: string; // crypto.randomUUID()
  name: string; // 1–30 code points; "Anonymous" if none given
  text: string; // 1–80 code points, normalised
  createdAt: string; // ISO 8601
};

export const NOTE_MAX = 80;
export const NAME_MAX = 30;
export const WALL_LIMIT = 25;
export const STORE_CAP = 1000;
const KEY = 'notes:v1';

/** Length in code points, so an emoji counts as 1 on both client and server. */
export const cpLength = (s: string) => Array.from(s).length;

/** Cut to at most `max` code points (used by the inputs instead of `maxLength`). */
export const cpClamp = (s: string, max: number) =>
  Array.from(s).slice(0, max).join('');

const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
// Zero-width and bidi-override characters. U+200D (ZWJ) is kept so emoji sequences survive.
const INVISIBLE =
  /[\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

export function normalise(s: string) {
  return s
    .replace(CONTROL, ' ')
    .replace(INVISIBLE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const LINK = /(https?:\/\/|www\.)|\b[a-z0-9-]{2,}\.[a-z]{2,24}\b/i;
const RESERVED_NAMES = new Set(['jeet', 'jeet kalita', 'admin', 'moderator']);

export type NoteCheck =
  | { ok: true; name: string; text: string }
  | { ok: false; error: string };

export function validateNote(input: {
  name?: unknown;
  text?: unknown;
}): NoteCheck {
  const text = typeof input.text === 'string' ? normalise(input.text) : '';
  const name = typeof input.name === 'string' ? normalise(input.name) : '';

  if (!text) return { ok: false, error: 'Write something first.' };
  if (cpLength(text) > NOTE_MAX)
    return { ok: false, error: `Notes are ${NOTE_MAX} characters max.` };
  if (cpLength(name) > NAME_MAX)
    return { ok: false, error: `Names are ${NAME_MAX} characters max.` };
  if (LINK.test(text) || LINK.test(name))
    return { ok: false, error: "Links aren't allowed in notes." };
  if (RESERVED_NAMES.has(name.toLowerCase()))
    return { ok: false, error: 'Pick a different name.' };

  return { ok: true, name: name || 'Anonymous', text };
}

function isNote(v: unknown): v is Note {
  if (!v || typeof v !== 'object') return false;
  const n = v as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.name === 'string' &&
    typeof n.text === 'string' &&
    typeof n.createdAt === 'string'
  );
}

export async function addNote(redis: Redis, note: Note) {
  await redis
    .pipeline()
    .lpush(KEY, JSON.stringify(note))
    .ltrim(KEY, 0, STORE_CAP - 1)
    .exec();
}

export async function listNotes(
  redis: Redis,
  limit = WALL_LIMIT
): Promise<{ notes: Note[]; total: number }> {
  const [raw, total] = await redis
    .pipeline()
    .lrange(KEY, 0, limit - 1)
    .llen(KEY)
    .exec<[unknown[], number]>();
  const notes: Note[] = [];
  for (const entry of raw ?? []) {
    // @upstash/redis auto-parses JSON, but tolerate raw strings and skip anything malformed.
    let value = entry;
    if (typeof entry === 'string') {
      try {
        value = JSON.parse(entry);
      } catch {
        continue;
      }
    }
    if (isNote(value)) notes.push(value);
  }
  return { notes, total: total ?? notes.length };
}
