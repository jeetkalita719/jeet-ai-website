# Jeet Kalita — AI-native personal website (v1)

Chat-first portfolio + AI sales assistant. Ask the site anything about Jeet, his projects, skills, and the AI solutions he builds for businesses.

**Stack:** Next.js (App Router) · Vercel AI SDK · OpenAI (`gpt-4o-mini`) with tool-calling that renders cards in the chat · Tailwind + shadcn/ui · Framer Motion.

## Run locally
```bash
pnpm install
cp .env.example .env   # add OPENAI_API_KEY
pnpm dev               # http://localhost:3000
```

## Edit your content
Everything about Jeet lives in **`src/lib/profile.ts`** — bio, services, projects, skills, fun facts, socials. Cards and the AI's system prompt both read from it. To add a resume download, drop a PDF at `public/resume.pdf`.

## Guardrails
`src/app/api/chat/route.ts` has a per-IP rate limit, message-length and conversation-length caps, and strips any client-supplied system prompt. Also set a monthly spend limit in the OpenAI dashboard before sharing the site publicly.

## Credit
v1 is based on the structure of [toukoum/portfolio](https://github.com/toukoum/portfolio) by Raphaël Giraud — credit to him for the AI-native portfolio concept. All content, persona, design and assets here are Jeet's own.
