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

There is no test suite. Env vars (see `.env.example`): `OPENAI_API_KEY` (required), optional `OPENAI_MODEL` (default `gpt-4o-mini`), `NEXT_PUBLIC_SITE_URL`.

## Architecture

**Single source of truth: `src/lib/profile.ts`.** Exports `PROFILE`, `SERVICES`, `SKILLS`, `PROJECTS` (+ `Project` type), `FUN`, `QUICK_QUESTIONS`. Both the UI cards and the LLM system prompt read from it — content changes go here, not into components or the prompt.

**Request flow:**
1. Landing page (`src/app/page.tsx`) routes to `/chat?query=...` (free text or a `QUICK_QUESTIONS` button).
2. `src/components/chat/chat.tsx` uses `useChat` from `@ai-sdk/react` (AI SDK v4), auto-submitting the `query` param.
3. `src/app/api/chat/route.ts` runs `streamText` with OpenAI, `maxSteps: 2`, and the tool set. It also enforces guardrails: in-memory per-IP rate limit, max messages per chat, max message length, and strips any client-supplied `system` message before prepending `SYSTEM_PROMPT`. Provider errors are logged server-side and replaced with a friendly message — never leak upstream error text to the client.
4. `src/app/api/chat/prompt.ts` builds `SYSTEM_PROMPT` by interpolating `profile.ts` data, and defines the persona, tone, tool-routing rules, and hard rules (never quote prices, never invent clients/metrics, don't name the underlying model, don't discuss stealth projects).

**Tools are display triggers, not data fetchers.** Each `src/app/api/chat/tools/get*.ts` is an AI SDK `tool()` with empty zod params whose `execute` returns a short string. The actual card is rendered client-side by `src/components/chat/tool-renderer.tsx`, which maps tool name → component (`src/components/{presentation,skills,services,contact,resume,fun}.tsx`, `projects/AllProjects.tsx`).

**Adding a new card/tool** requires touching all of: a new file in `api/chat/tools/`, the `tools` object in `route.ts`, the `COMPONENTS` map in `tool-renderer.tsx`, the card component, and the "Tool usage" routing section in `prompt.ts`.

## Conventions

- UI: Tailwind v4 (`@tailwindcss/postcss`, no tailwind.config.js) + shadcn/ui (`components.json`, primitives in `src/components/ui/`). Path alias `@/*` → `src/*`.
- Theme is forced dark (`<html className="dark">`, `ThemeProvider` with `enableSystem={false}`); don't reintroduce a light/system toggle without being asked.
- Prettier: single quotes, semicolons, 2-space, `es5` trailing commas, `prettier-plugin-tailwindcss` for class sorting.
- Both `eslint.config.mjs` (flat, used by ESLint 9) and a legacy `.eslintrc.js` exist; the flat config is the effective one.
- Resume card expects a PDF at `public/resume.pdf`; the "Me" card photo is `PROFILE.photo` (`public/jeet.jpg`).
