import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { SYSTEM_PROMPT } from './prompt';
import { getContact } from './tools/getContact';
import { getFun } from './tools/getFun';
import { getPresentation } from './tools/getPresentation';
import { getProjects } from './tools/getProjects';
import { getResume } from './tools/getResume';
import { getServices } from './tools/getServices';
import { getSkills } from './tools/getSkills';

export const maxDuration = 30;

/* ---------------- basic abuse guard ----------------
 * Per-IP sliding window, in-memory. Good enough to stop a bored visitor from
 * draining the API budget; it resets per serverless instance. For a hard
 * guarantee also set a monthly spend cap in the OpenAI dashboard.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const MAX_MESSAGES_PER_CHAT = 30;
const MAX_MESSAGE_CHARS = 1500;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function errorHandler(error: unknown) {
  if (error == null) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return JSON.stringify(error);
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (rateLimited(ip)) {
      return new Response('Too many messages — give it a minute and try again.', { status: 429 });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('Bad request', { status: 400 });
    }
    if (messages.length > MAX_MESSAGES_PER_CHAT) {
      return new Response('This conversation is getting long — refresh to start a new one.', { status: 413 });
    }
    const last = messages[messages.length - 1];
    if (typeof last?.content === 'string' && last.content.length > MAX_MESSAGE_CHARS) {
      return new Response('Message too long.', { status: 413 });
    }

    // Never trust a client-supplied system message; ours always goes first.
    const safeMessages = messages.filter((m: { role?: string }) => m?.role !== 'system');
    safeMessages.unshift(SYSTEM_PROMPT);

    const tools = {
      getPresentation,
      getProjects,
      getSkills,
      getServices,
      getContact,
      getResume,
      getFun,
    };

    const result = streamText({
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      messages: safeMessages,
      toolCallStreaming: true,
      tools,
      maxSteps: 2,
    });

    return result.toDataStreamResponse({ getErrorMessage: errorHandler });
  } catch (err) {
    console.error('Global error:', err);
    return new Response(errorHandler(err), { status: 500 });
  }
}
