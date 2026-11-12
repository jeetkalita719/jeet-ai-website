# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Jeet Kalita's chat-first personal site: a Next.js 15 (App Router, React 19) app where visitors talk to an AI persona of Jeet. The LLM answers in first person and calls tools that render rich cards (projects, skills, contact, etc.) inside the chat. Based on the structure of toukoum/portfolio; all content is Jeet's own.

## Commands

Package manager is **pnpm**.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # ESLint errors do NOT fail the build (next.config.ts: ignoreDuringBuilds)
pnpm lint     # next lint
```

There is no test suite. Env vars (see `.env.example`): `OPENAI_API_KEY` (required), optional `OPENAI_MODEL` (default `gpt-4o-mini`), `NEXT_PUBLIC_SITE_URL`, and optional `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (or the Vercel KV names `KV_REST_API_URL`/`KV_REST_API_TOKEN`). Without Redis the notes wall and "Draft my email" are disabled and the chat falls back to an in-memory rate limiter.

## Architecture

**Single source of truth: `src/lib/profile.ts`.** Exports `PROFILE`, `SERVICES`, `SKILLS`, `PROJECTS` (+ `Project` type), `FUN`, `QUICK_QUESTIONS`. Both the UI cards and the LLM system prompt read from it — content changes go here, not into components or the prompt. Unfinished values use `{{FILL...}}` placeholders; check them with the exported `filled()` helper rather than rendering them.

**Request flow:**
1. Landing page (`src/app/page.tsx`) routes to `/chat?query=...` (free text or a `QUICK_QUESTIONS` button).
2. `src/components/chat/chat.tsx` uses `useChat` from `@ai-sdk/react` (AI SDK v4), auto-submitting the `query` param.
3. `src/app/api/chat/route.ts` runs `streamText` with OpenAI, `maxSteps: 2`, and the tool set. It also enforces guardrails: per-IP rate limit (`chatRateLimited` from `src/lib/ratelimit.ts`), max messages per chat, max message length, and strips any client-supplied `system` message before prepending `SYSTEM_PROMPT`. Provider errors are logged server-side and replaced with a friendly message — never leak upstream error text to the client.
4. `src/app/api/chat/prompt.ts` builds `SYSTEM_PROMPT` by interpolating `profile.ts` data, and defines the persona, tone, tool-routing rules, and hard rules (never quote prices, never invent clients/metrics, don't name the underlying model, don't discuss stealth projects).

**Tools are display triggers, not data fetchers.** Each `src/app/api/chat/tools/get*.ts` is an AI SDK `tool()` with empty zod params whose `execute` returns a short string. The actual card is rendered client-side by `src/components/chat/tool-renderer.tsx`, which maps tool name → component (`src/components/{presentation,skills,services,contact,resume,fun}.tsx`, `projects/AllProjects.tsx`).

**Other API routes**, both used by the contact card (`src/components/contact.tsx` + `src/components/contact/`):
- `api/notes` — public visitor notes wall stored in a Redis list. Validation lives in `src/lib/notes.ts` and is shared by the client composer and the server so the limits always agree (lengths counted in code points). Also uses a honeypot, link/reserved-name checks and OpenAI moderation.
- `api/draft` — "Draft my email": `generateObject` turns the visitor's chat into a short email they send from their own mail client. The transcript is never logged or stored.

**Rate limiting (`src/lib/ratelimit.ts`)**: named Upstash sliding-window limiters keyed by a SHA-256 hash of the IP (raw IPs are never stored). The chat limiter **fails open**; the notes and draft limiters **fail closed** (503). Both routes are off when Redis isn't configured, so an unlimited LLM endpoint is never exposed. Keep this policy when touching these routes.

**Adding a new card/tool** requires touching all of: a new file in `api/chat/tools/`, the `tools` object in `route.ts`, the `COMPONENTS` map in `tool-renderer.tsx`, the card component, and the "Tool usage" routing section in `prompt.ts`.

## Conventions

- Feature work is spec-first: write a numbered spec in `.claude/specs/NN-<slug>.md` (format of `cards-ui-fix.md`) and wait for review before coding. Implementation plans go in `.claude/plans/`.

- UI: Tailwind v4 (`@tailwindcss/postcss`, no tailwind.config.js) + shadcn/ui (`components.json`, primitives in `src/components/ui/`). Path alias `@/*` → `src/*`.
- Theme is forced dark (`<html className="dark">`, `ThemeProvider` with `enableSystem={false}`); don't reintroduce a light/system toggle without being asked.
- Prettier: single quotes, semicolons, 2-space, `es5` trailing commas, `prettier-plugin-tailwindcss` for class sorting.
- Both `eslint.config.mjs` (flat, used by ESLint 9) and a legacy `.eslintrc.js` exist; the flat config is the effective one.
- Resume card expects a PDF at `public/resume.pdf`; the "Me" card photo is `PROFILE.photo` (`public/jeet.jpg`).
