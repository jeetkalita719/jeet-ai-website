# Spec: Contact card — one-tap channels and a public notes wall

Status: Draft (rev. 3) · Owner: Jeet Kalita · Date: 2026-10-22
Scope: `src/components/contact.tsx` (rewritten) + new `src/components/contact/*`, new `src/app/api/notes/route.ts`, new `src/app/api/draft/route.ts`, new `src/lib/notes.ts`, new `src/lib/ratelimit.ts`, new `src/components/chat/chat-messages-context.tsx`, `src/components/chat/chat.tsx` (wraps content in the messages context provider only), `src/app/api/chat/route.ts` (rate limiter only), `src/lib/profile.ts` (data only), `src/components/chat/HelperBoost.tsx` (prompt text only), `src/app/api/chat/tools/getContact.ts` and `src/app/api/chat/prompt.ts` (routing text only), `.env.example`, `package.json` (two deps)

> **Placeholders, filled in manually by Jeet.** Every value written as `{{FILL: …}}` in this spec is an input only Jeet can provide. The implementation reads them from `profile.ts` or env vars. Until a value is filled, the feature that needs it degrades as described below; it never breaks the card.
>
> | Input | Where it lives | Used by | Value / status | If left empty |
> |---|---|---|---|---|
> | Instagram handle | `PROFILE.handles.instagram` | Instagram tile | ✅ `jeet.k_` | Tile hidden |
> | X handle | `PROFILE.handles.x` | X tile (profile fallback) | ✅ `JeetKalita719` | Tile hidden |
> | X numeric user ID | `PROFILE.handles.xUserId` | X DM deep link | ✅ `1641144910240677888` (DMs open to everyone) | Tile links to the X profile instead |
> | LinkedIn slug | `PROFILE.handles.linkedin` | LinkedIn tile | ✅ `jeetkalita` | Tile hidden |
> | `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | `.env.local` / Vercel env (never in this file) | Notes wall, all rate limits | ✅ Database created; keys set by Jeet (values not recorded here) | Wall shows the offline state; chat falls back to the in-memory limiter; the draft endpoint is disabled |

---

## 1. Problem statement

When the assistant calls `getContact`, the chat renders `Contact` (`src/components/contact.tsx`): a heading, an email link and a row of plain-text social links. Today that row only contains GitHub — LinkedIn and X are commented out in `PROFILE.socials`. Reaching Jeet means copying an address or hunting for a profile, and there is nothing on the card that invites a visitor who isn't ready to email.

**Goal.** Make the card the easiest possible way to reach Jeet, and give visitors a low-commitment way to leave a mark:

1. **Four one-tap channels** — Instagram, X (Twitter), LinkedIn, Mail — each opening a DM or compose window directly where the platform allows it.
2. **"Leave a note for me and everyone else"** — any visitor, without signing in, writes a short note (optional name). It is stored server-side and shown as a card to every later visitor.
3. **"Draft my email"** — a visitor who has already chatted can turn the conversation into a ready-to-send email to Jeet, preview and edit it, then open it in their mail client.

It stays a **chat card**, not a new page, and keeps the site's look: forced-dark zinc palette, `bg-accent rounded-3xl` card shell, Geist, `text-muted-foreground` secondary text.

**Smaller defects in the current card (fixed as part of the rewrite):**
- Social links are `<button onClick={window.open}>` — no middle-click/copy-link, no `href` for assistive tech, and some popup blockers interfere. They become real `<a>` elements.
- The contact prompt text is duplicated: `QUICK_QUESTIONS.Contact` in `src/lib/profile.ts` and a hard-coded copy in the local `questions` object in `src/components/chat/HelperBoost.tsx`. Changing one silently leaves the other stale.
- Card padding `md:px-16` leaves too little width for a 3-column grid inside the chat's `max-w-3xl` column.
- The chat route's rate limiter (`src/app/api/chat/route.ts`, `hits` Map) is in-memory, so on Vercel each serverless instance has its own counter, and a cold start resets it. It doesn't actually cap a determined visitor. Once Redis exists for the notes, it moves there.

---

## 2. Functional requirements

### FR-1: New contact prompt
- `QUICK_QUESTIONS.Contact` becomes `'Hey I want to connect. How can I contact you?'`. This is the bubble shown at the top of the chat when the visitor clicks **Contact** on the landing page (`src/app/page.tsx`) or in the in-chat helper (`HelperBoost`).
- `HelperBoost.tsx` deletes its local `questions` object and imports `QUICK_QUESTIONS` from `@/lib/profile`.
- Out of scope: the empty-state chip "How do we start a project?" in `chat-landing.tsx` and the drawer's "How can I reach you?" — they are different phrasings and still route to `getContact`.

### FR-2: Card layout
Top to bottom, inside the existing shell (`bg-accent w-full overflow-hidden rounded-3xl`), with padding reduced to `px-5 py-7 sm:px-8 md:px-10 md:py-10`:

1. **Header** — heading "Let's connect" (`text-foreground text-3xl md:text-4xl font-semibold`, as today) and the subline "Replies personally, usually within a day" (`text-muted-foreground text-sm`). Both strings come from `PROFILE.contact` (§3.1).
2. **Channel tiles** (FR-3) — Instagram, X, LinkedIn, Mail, in that order.
3. **Note tile / composer** (FR-4).
4. **Notes wall** (FR-5) — small section title "Notes from visitors" + total count on the right ("128 notes"), then the grid, then the "Scroll to view" hint.

### FR-3: Channel tiles open the DM or compose window directly
- Grid: `grid grid-cols-2 gap-3 sm:grid-cols-4`.
- Tile: an `<a>` with `bg-card ring-1 ring-white/5 rounded-2xl p-4`, brand icon (`@tabler/icons-react`: `IconBrandInstagram`, `IconBrandX`, `IconBrandLinkedin`, `IconMail`), label (`text-sm font-medium text-foreground`) and hint (`text-xs text-muted-foreground`). Hover: `hover:ring-white/15`, `hover:-translate-y-0.5`, icon shifts from `text-muted-foreground` to the brand tint. External links use `target="_blank" rel="noopener noreferrer"`; `mailto:` does not.

| Tile | Hint | `href` | Notes |
|---|---|---|---|
| Instagram | DM me | `https://ig.me/m/<instagram>` | Opens the DM thread (app on phones; instagram.com/direct on desktop, login required). No prefill support. |
| X | DM me | `https://x.com/messages/compose?recipient_id=<xUserId>&text=<dmText>` | Requires Jeet's numeric user id and DMs open to everyone. If `xUserId` is empty, falls back to `https://x.com/<x>`. |
| LinkedIn | Connect | `https://www.linkedin.com/in/<linkedin>/` | No reliable DM deep link exists; profile only. |
| Mail | Email me | Desktop (fine pointer): `https://mail.google.com/mail/?view=cm&fs=1&to=<email>&su=<subject>&body=<body>`. Touch (coarse pointer): `mailto:<email>?subject=<subject>&body=<body>` | `mailto:` silently does nothing on many desktops with no mail app; on phones it opens the mail app, which is better than Gmail web. Pointer type is read with `matchMedia('(pointer: coarse)')` after mount. |

- The Mail tile has a **copy-email** icon button in its top-right corner. It is a **sibling** of the tile's `<a>`, absolutely positioned over it — never nested inside the link (nested interactive elements are invalid HTML). Click → `navigator.clipboard.writeText(email)` → sonner toast "Email copied". `aria-label="Copy email address"`.
- All values (handles, email, subject, body, DM text) come from `profile.ts`. All query values go through `encodeURIComponent`.
- A tile whose handle is empty is not rendered; the grid reflows.

### FR-4: Note tile expands in place into the composer
- **Collapsed:** a full-width tile below the channels, `rounded-2xl border border-dashed border-white/15 p-4`, pencil icon, text "I want to leave a note for everyone", arrow on the right. It is a `<button>` with `aria-expanded`.
- **Expanded:** the same element morphs in place (shared `layoutId="note-composer"`, no modal, no portal) into the composer:
  - Name input — optional, placeholder "Your name (optional)", max 30 characters.
  - Note textarea — required, placeholder "Say hi, share a thought…", max **80 characters**, live counter "42/80" that turns `text-destructive` at the limit. Typing beyond 80 is prevented.
  - Hidden honeypot input `website` (visually hidden, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`).
  - Buttons: **Cancel** (ghost) and **Publish** (primary `Button`, disabled while the note is empty or a request is in flight).
- Focus moves to the textarea on expand. **Enter** publishes (notes are single-line); **Esc** or Cancel collapses the composer and keeps the draft in state until the card unmounts.
- Inline errors render under the textarea in `text-xs text-destructive`, using the server's `error` string.

### FR-5: Publish sequence and "fly into the wall" animation
1. Click **Publish** → button shows a spinner + "Publishing…", inputs disabled; the wall's scroller scrolls to the top (`scrollTo({ top: 0, behavior: 'smooth' })`) so slot 0 is visible.
2. `POST /api/notes` (§3.2). The client **waits for the server** — no optimistic insert — because moderation can reject the note and a card that flies in and then disappears is worse than a ~1s wait.
3. On **201**: in one state update, the composer collapses back to the tile and the returned note is inserted at index 0 of the wall. The composer's text surface and the new note card share `layoutId="note-draft"`, so the note visibly travels from the composer down into the **top-left** slot (spring, ~450ms). Existing note cards have `layout` and slide one position right/down. The total count increments. The new note's footer shows "· you" for the rest of the session (in-memory only).
4. On **4xx/5xx**: composer stays open, draft preserved, inline error shown, Publish re-enabled.
5. **Reduced motion** (`useReducedMotion()`): no morph or flight — the composer simply closes and the note fades in at slot 0.

### FR-6: Notes wall
- Fetched on card mount with `GET /api/notes` (`cache: 'no-store'`). Newest first, laid out row-major, so the most recent note is top-left.
- Shows at most **25** notes.
- Grid: `grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3`. Three per row is only possible at `md`+; at phone width a third of the card is ~100px, which can't hold 80 characters legibly.
- Note card: `bg-card ring-1 ring-white/5 rounded-2xl p-4 h-32 flex flex-col`. Text `text-sm text-foreground line-clamp-4 [overflow-wrap:anywhere]`; spacer; footer `text-xs text-muted-foreground`: "— {name} · {relative time}" (e.g. "— Ana · 2d ago", via `Intl.RelativeTimeFormat`). Rendered as plain text — no markdown, no HTML.
- **Scroller:** the grid sits in a `motion.div` with `layoutScroll`, `overflow-y-auto overscroll-contain`, and a max height of **2 full rows + half a row** (with `h-32` rows and `gap-3`: `max-h-[21.5rem]`). The half-cut row is the main scroll cue.
- **Fade + hint:** while the scroller can scroll further down, apply `[mask-image:linear-gradient(to_bottom,black_80%,transparent)]` and show a faded "Scroll to view" line (with a small chevron) under it, `text-xs text-muted-foreground/70`. The hint fades out once `scrollTop > 8` or when the content doesn't overflow.
- **States:** loading → 3 skeleton cards (`animate-pulse bg-card`); empty → "No notes yet — be the first." in place of the grid; load error → "Couldn't load notes right now." (channels and composer still work); store not configured (`offline: true`) → "Notes are taking a break." and the note tile is disabled.

### FR-7: Server-side validation and abuse protection (no sign-in)
Anyone can post, no account, optional name. Protection is invisible to real visitors:
- **Normalise:** trim, strip control and zero-width characters, collapse all whitespace (including newlines) to single spaces.
- **Length** is counted in code points (`[...s].length`), identically on client and server: text 1–80, name 0–30. Empty name → stored as `"Anonymous"`.
- **No links:** reject text or name matching a URL/domain pattern (`http(s)://`, `www.`, `something.tld`) with "Links aren't allowed in notes."
- **Reserved names:** reject names equal (case-insensitive) to `jeet`, `jeet kalita`, `admin`, `moderator` with "Pick a different name." — nobody gets to post as Jeet.
- **Honeypot:** if `website` is non-empty, return a normal-looking **201** with a fake note and store nothing.
- **Rate limits** (`@upstash/ratelimit`, sliding window): **3 notes / hour per IP** and **200 notes / day globally**. The IP is SHA-256 hashed before use as a key.
- **Moderation:** `POST https://api.openai.com/v1/moderations` with `model: 'omni-moderation-latest'` and input `"{name}\n{text}"`, using the existing `OPENAI_API_KEY`, 5s timeout. Flagged → 422. If the moderation call fails or times out → 503 (**fail closed**: nothing unmoderated goes live on a public wall).
- Upstream error text is logged server-side (`console.error('[notes] …')`) and never sent to the client (same rule as `api/chat/route.ts`).

### FR-8: Assistant routing
- `getContact.ts` description adds: connect, socials, Instagram, LinkedIn, Twitter/X, DM, leave a note, guestbook. Its `execute` string becomes: "My contact options and the visitors' notes wall are above. Pick whichever's easiest — or leave a note for everyone."
- `prompt.ts` "Tool usage" line for contact becomes: "Contact / connect / reach you / socials / start a project / hire you / leave a note → getContact". Add: "After getContact, one short line at most — don't list handles or the email; the card shows them."
- No new tool: the notes wall lives inside the contact card.

### FR-9: "Draft my email" from the conversation
- **Where:** a full-width secondary button directly under the channel tiles: "✨ Draft my email from this chat" (`rounded-2xl ring-1 ring-white/10 bg-card/60 text-sm`). It is a separate element, never nested in the Mail tile.
- **When it shows:** only if the conversation has **at least 2 visitor messages** (the contact prompt itself counts as one, so the visitor must have asked something else first). Otherwise it isn't rendered and the Mail tile uses the static `emailSubject` / `emailBody`.
- **How the card gets the conversation:** `ToolRenderer` renders `<Contact />` with no props, so `chat.tsx` wraps its content in a new `ChatMessagesProvider` (`src/components/chat/chat-messages-context.tsx`) that exposes the `messages` from its existing `useChat`. `Contact` reads them with `useChatMessages()`, which returns `[]` when there is no provider.
- **Flow (two steps, on purpose):**
  1. Click → button shows "Drafting…" → `POST /api/draft` (§3.5).
  2. On success, an inline **preview panel** expands under the button (same in-place pattern as FR-4): an editable subject input, an editable body textarea (max 1,000 characters), and three actions: **Open in Gmail** (desktop) or **Open in Mail** (touch), **Copy**, **Discard**.
  - The second click is a fresh user gesture, so opening Gmail with `window.open` is never popup-blocked. Calling `window.open` after an `await` would be. It also lets the visitor see and fix what is sent in their name.
- **Compose links** reuse FR-3's Mail logic with the drafted subject/body. Copy puts `Subject: …\n\n{body}` on the clipboard, with a toast.
- **On failure** (any non-200): toast "Couldn't draft that — here's a starter instead." and open the preview panel prefilled with the static template, so the visitor is never stuck.
- **Draft content rules** (enforced by the endpoint's prompt): first person *as the visitor*, addressed to Jeet, 3–6 short sentences. It summarises what the visitor said they want or asked about, uses only facts from the visitor's own messages, invents no names, budgets, dates or company details, and has no bracketed placeholders. It never quotes a price (the site's no-pricing rule applies). Signs off with the visitor's name only if they stated it in the chat.

### FR-10: (removed in rev. 3)
- No notification is sent when a note is published. Jeet does not want to be reached on Telegram. He sees new notes on the wall or in the Upstash console. No `src/lib/notify.ts` and no Telegram env vars. The number is kept so that references to FR-11 stay valid.

### FR-11: Chat rate limiter moves to Upstash
- `src/lib/ratelimit.ts` owns the shared Redis client lookup, the IP extraction (`x-forwarded-for` → `x-real-ip` → `'unknown'`), SHA-256 hashing, and named limiters:
  - `chat`: sliding window **12 / minute** per IP. Same numbers as today's `WINDOW_MS` / `MAX_PER_WINDOW`.
  - `notesIp`: **3 / hour**, `notesGlobal`: **200 / day** (FR-7).
  - `draft`: **5 / hour** per IP.
- `api/chat/route.ts` replaces `rateLimited(ip)` with the `chat` limiter. **If Redis isn't configured, it falls back to the existing in-memory function**, which is kept in `ratelimit.ts`, so local dev and an unconfigured deploy still work. The 429 message, `MAX_MESSAGES_PER_CHAT`, `MAX_MESSAGE_CHARS`, the system-message stripping and the error handling are unchanged.
- If a Redis call errors at request time, the chat limiter **fails open**: log it and let the message through. A Redis blip must not take the chat down. The notes and draft limiters **fail closed** (503).

### Non-goals
- No sign-in, no editing or deleting notes by visitors, no reactions/likes, no replies.
- No admin UI — Jeet removes a note from the Upstash console (`LREM`).
- No real-time updates — a new note from someone else appears on the next card mount.
- No pagination beyond the newest 25; no marquee.
- No changes to `simple-chat-view.tsx` or `tool-renderer.tsx`. `chat.tsx` only gains the `ChatMessagesProvider` wrapper. `api/chat/route.ts` only changes its rate limiter.
- No sending email on the visitor's behalf. The draft only opens their own mail client.
- No notifications of any kind: none for new notes, none for chat messages, no Telegram.
- No light-theme work; no Tailwind version bump.

---

## 3. API contracts (inputs, outputs, data shapes)

The `getContact` LLM tool keeps empty zod params and still returns a short string. New contracts are the profile data, the `Note` shape and `/api/notes`.

### 3.1 `profile.ts`: additive change

```ts
export const PROFILE = {
  // …existing fields…
  email: 'jeetkalita719@gmail.com',
  handles: {
    instagram: 'jeet.k_',                     // username, no @
    x: 'JeetKalita719',                       // username, no @
    xUserId: '1641144910240677888',           // numeric id for the DM deep link; '' → profile link fallback
    linkedin: 'jeetkalita',                   // the part after linkedin.com/in/
  },
  contact: {
    heading: "Let's connect",
    subline: 'Replies personally, usually within a day',
    emailSubject: 'Hey Jeet — found you through your site',
    emailBody: 'Hi Jeet,\n\n',
    dmText: 'Hey Jeet! Found you through your website 👋',
  },
  socials: [ /* GitHub + entries built from handles: { name, url } — still feeds socialsText in prompt.ts */ ],
};

export const QUICK_QUESTIONS = {
  // …
  Contact: 'Hey I want to connect. How can I contact you?',
} as const;
```

The handles and `xUserId` above are final (rev. 3) and go into `profile.ts` as written. `xUserId` stays a string, because the number is larger than JavaScript can store exactly as a number. The Upstash env vars are set outside the repo (see the table at the top, and AC-13). Any value that is unset in code is `''`, and the literal `{{FILL: …}}` strings must never ship. A value that is empty or still contains `{{FILL` is treated as empty (tile hidden / fallback). `socials` keeps its `{ name, url }` shape so `prompt.ts` needs no structural change. Empty handles are left out of `socials`, so the assistant never mentions a channel that doesn't exist.

### 3.2 `/api/notes` (`src/app/api/notes/route.ts`, `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`)

```ts
export type Note = {
  id: string;        // crypto.randomUUID()
  name: string;      // 1–30 code points; "Anonymous" if none given
  text: string;      // 1–80 code points, normalised
  createdAt: string; // ISO 8601
};
```

**`GET /api/notes`**

| Status | Body |
|---|---|
| 200 | `{ notes: Note[]; total: number }` — newest first, `notes.length ≤ 25` |
| 200 | `{ notes: []; total: 0; offline: true }` — Redis env vars missing (e.g. local dev) |
| 500 | `{ error: "Couldn't load notes right now." }` |

**`POST /api/notes`** — body `{ name?: string; text: string; website?: string }`

| Status | Body | When |
|---|---|---|
| 201 | `{ note: Note }` | Stored (or honeypot hit — fake note, not stored) |
| 400 | `{ error: string }` | Validation failed (length, links, reserved name, bad JSON) |
| 422 | `{ error: "That note didn't pass the filter — try rewording it." }` | Moderation flagged |
| 429 | `{ error: "You've left a few notes already — try again in a bit." }` | Per-IP or global rate limit |
| 503 | `{ error: "Notes are taking a break — try again later." }` | Redis not configured, or moderation unavailable |

### 3.3 Storage (`src/lib/notes.ts`)

- Client: `new Redis({ url, token })` from `@upstash/redis`, reading `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, falling back to `KV_REST_API_URL` / `KV_REST_API_TOKEN` (the names the Vercel Marketplace integration may set). Missing → `notesStore = null` and the route answers as "offline".
- Key `notes:v1` is a Redis list of JSON-encoded `Note`s.
- `addNote(note)`: pipeline `LPUSH notes:v1 <json>` + `LTRIM notes:v1 0 999` (store cap 1,000).
- `listNotes(limit = 25)`: pipeline `LRANGE notes:v1 0 24` + `LLEN notes:v1` → `{ notes, total }`. Malformed entries are skipped, not thrown.
- Rate limiter prefixes (defined in `src/lib/ratelimit.ts`, FR-11): `rl:chat`, `rl:notes:ip`, `rl:notes:global`, `rl:draft`.
- New deps: `@upstash/redis`, `@upstash/ratelimit`.
- `.env.example` gains these lines, all commented as optional, each with a one-line note on what it unlocks:
  ```
  # optional: UPSTASH_REDIS_REST_URL={{FILL: UPSTASH_REDIS_REST_URL}}
  # optional: UPSTASH_REDIS_REST_TOKEN={{FILL: UPSTASH_REDIS_REST_TOKEN}}
  ```

### 3.4 Components (`src/components/contact/`)

```ts
<Contact />                                   // contact.tsx — shell, header, composes the rest (default + named export kept)
<ChannelTiles />                              // reads PROFILE; no props
<NoteComposer
  offline: boolean
  onPublished: (note: Note) => void           // parent inserts at index 0
/>
<NotesWall notes: Note[] total: number status: 'loading' | 'ready' | 'error' | 'offline' ownIds: Set<string> />
```

```ts
<DraftEmail messages: UIMessage[] />          // FR-9 button + preview panel; renders nothing below 2 visitor messages
```

`Contact` owns the notes state and the single `LayoutGroup` that wraps composer and wall, so `layoutId="note-draft"` can animate between them.

### 3.5 `/api/draft` (`src/app/api/draft/route.ts`, `runtime = 'nodejs'`)

**`POST /api/draft`**, body `{ messages: { role: 'user' | 'assistant'; content: string }[] }`

- The server drops any other role (including `system`), keeps the **last 20** messages, truncates each to 1,500 characters, and requires ≥ 2 `user` messages.
- It calls `generateText` (AI SDK v4, same `OPENAI_MODEL` default as the chat) with a dedicated drafting system prompt (FR-9 content rules) and the transcript as data. The output is parsed into `{ subject, body }`.
- Rate limited with `draft` (5 / hour / IP). If Redis isn't configured, the endpoint answers 503, so the UI falls back to the static template. An unlimited LLM endpoint is never exposed.

| Status | Body | When |
|---|---|---|
| 200 | `{ subject: string; body: string }` | `subject` ≤ 80 chars, `body` ≤ 1,000 chars |
| 400 | `{ error: "Not enough conversation to draft from." }` | Bad JSON, < 2 user messages |
| 429 | `{ error: "That's a lot of drafts — try again in a bit." }` | Rate limited |
| 503 | `{ error: "Couldn't draft that right now." }` | Redis missing, model error, unparsable output |

### 3.6 Chat messages context (`src/components/chat/chat-messages-context.tsx`)

```ts
export function ChatMessagesProvider(props: { messages: UIMessage[]; children: React.ReactNode }): JSX.Element;
export function useChatMessages(): UIMessage[]; // [] outside a provider
```

`UIMessage` here is the AI SDK v4 `Message` type that `useChat` already returns. The draft sends only `role` and the plain-text `content`. Tool invocations are not sent.

---

## 4. Constraints

- **C-1: Stack.** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui. Prettier: single quotes, semicolons, `es5` commas.
- **C-2: Forced dark theme.** No light/system toggle; colours use the existing tokens (`bg-accent`, `bg-card`, `text-muted-foreground`, `ring-white/*`).
- **C-3: Tailwind 4.0.** The installed version is 4.0.x; `mask-*` utilities arrived in 4.1 and silently do nothing here. Use arbitrary properties (`[mask-image:…]`).
- **C-4: Width budget.** The card renders inside `max-w-3xl` minus the chat's `px-2` and `simple-chat-view`'s `px-4`. With the FR-2 padding, each of 3 columns gets ~210px — enough for 80 characters in 4 lines at `text-sm`.
- **C-5: Nested scrolling.** The card already sits inside two scroll containers (`chat.tsx` main area and `simple-chat-view.tsx`'s inner div). The wall is a third. It must use `overscroll-contain` and a bounded height so it never traps page scroll, especially on touch.
- **C-6: Framer Motion owns transforms on `layoutId`/`layout` elements.** Hover lifts on tiles are fine as CSS (no `layoutId`); the composer, note cards and draft surface animate only through Framer props. The wall scroller needs `layoutScroll` so layout animations measure correctly after it has scrolled.
- **C-7: Single source of truth.** All copy, handles and prefill text live in `profile.ts`.
- **C-8: No upstream error text** reaches the client from `/api/notes`.
- **C-9: Cost.** Moderation is free. Each card mount costs one pipelined Upstash request, and each publish about 4 commands (2 rate-limit, LPUSH, LTRIM). Each chat message adds 1 rate-limit command. Each draft is one small LLM call, capped at 5/hour per IP. All of this fits well inside the free Upstash tier and adds little to the existing OpenAI bill.
- **C-10: Privacy.** Raw IPs are never stored. Only their SHA-256 hash is used as a rate-limit key, with the limiter's TTL. The draft endpoint doesn't log or store the transcript. No note data is sent to any third party except the OpenAI moderation call.
- **C-11: Popup blockers.** `window.open` only works synchronously inside a user gesture. Never call it after an `await`; that's why FR-9 has a preview step.
- **C-12: The chat route stays resilient.** The Upstash chat limiter fails open, and the in-memory limiter remains as the no-Redis fallback (FR-11). The chat must keep working with no Redis at all.

---

## 5. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| E-1 | Wall is empty | "No notes yet — be the first." No scroll hint. Composer works. |
| E-2 | Fewer notes than fit in 2.5 rows | No fade mask, no "Scroll to view". |
| E-3 | Redis env vars missing (local dev) | GET returns `offline: true`; wall shows "Notes are taking a break."; note tile disabled; channel tiles unaffected. |
| E-4 | GET fails | "Couldn't load notes right now." Composer still usable; on successful publish the note appears as the only card. |
| E-5 | Moderation flags the note | 422; composer stays open with the error; draft kept. |
| E-6 | Moderation API down or times out | 503, fail closed; nothing stored. |
| E-7 | 4th note within an hour from one IP | 429 with the friendly message. |
| E-8 | Bot fills the honeypot | 201 with a fake note; nothing stored; no UI difference (bots don't run the client). |
| E-9 | Note or name contains a URL/domain | 400 "Links aren't allowed in notes." |
| E-10 | Emoji / non-Latin text | Counted in code points on both sides; an emoji counts as 1. Counter and server agree. |
| E-11 | Whitespace-only or newline-heavy input | Collapsed; empty after trim → Publish stays disabled (client) / 400 (server). |
| E-12 | `<script>` or markdown in the note | Rendered as literal text by React. |
| E-13 | Name "Jeet" / "jeet kalita" | 400 "Pick a different name." |
| E-14 | Double-click Publish | Button disabled while in flight; one request. |
| E-15 | Two visitors post at the same moment | `LPUSH` is atomic; both stored; each sees the other's note on the next mount. |
| E-16 | Assistant calls `getContact` again | Card remounts and refetches; previous draft is lost (acceptable). |
| E-17 | Card unmounts while a POST is in flight | Request completes server-side; no state update after unmount (guard with an abort/mounted flag). |
| E-18 | Long unbroken string (80 × "a") | Wraps via `[overflow-wrap:anywhere]`; never widens the card. |
| E-19 | Clipboard API unavailable (insecure context, old browser) | Toast shows the address instead: "Email: jeetkalita719@gmail.com". |
| E-20 | `xUserId` empty or DMs closed | Tile links to the X profile instead of the DM composer. |
| E-21 | Instagram on desktop, logged out | Instagram login page — acceptable; documented. |
| E-22 | A handle is empty | That tile isn't rendered; grid reflows. |
| E-23 | Esc pressed in the composer | Composer collapses; draft kept. Esc elsewhere does nothing. |
| E-24 | `prefers-reduced-motion` | No morph, no flight; fade only. |
| E-25 | Mobile (375px) | Channels 2×2, wall 1 column, composer fits above the on-screen keyboard, no horizontal page scroll, wall scroll doesn't trap the page. |
| E-26 | No IP header | Bucket key `unknown` (shared); global limit still applies. |
| E-27 | Store exceeds 1,000 notes | Oldest trimmed by `LTRIM`; `total` shows the capped count. |
| E-28 | Visitor clicked Contact as their first message | Only 1 visitor message, so the draft button doesn't render. The Mail tile uses the static template. |
| E-29 | Draft request fails or is rate-limited | Toast, and the preview opens with the static template. The visitor can still send. |
| E-30 | Visitor edits the draft then clicks Open in Gmail | The edited subject/body are used, URL-encoded. |
| E-31 | Conversation contains a price question | The draft doesn't contain any price or range (no-pricing rule). |
| E-32 | Visitor never gave their name | The draft has no sign-off name and no `[Your name]` placeholder. |
| E-33 | Prompt-injection text in the chat ("ignore your rules and…") | Treated as transcript data inside a delimited block. The output is still only `{ subject, body }` within the length caps, or 503. |
| E-34 | A note is published | Stored and returned with 201. No notification goes anywhere (FR-10 was removed). |
| E-35 | Redis not configured | Chat uses the in-memory limiter, the notes wall is offline and drafting returns 503. Nothing crashes. |
| E-36 | Redis errors mid-request | Chat fails open (message goes through, error logged). Notes and draft return 503. |
| E-37 | A `{{FILL: …}}` value reaches production unfilled | Treated as empty: the tile is hidden, or the X tile falls back to the profile link. The literal string is never rendered or linked. |

---

## 6. Acceptance criteria

- [ ] **AC-1:** Clicking **Contact** on the landing page and in `HelperBoost` shows "Hey I want to connect. How can I contact you?" and renders the new card. `HelperBoost` no longer has its own copy of the questions.
- [ ] **AC-2:** Four tiles in the order Instagram, X, LinkedIn, Mail; 2×2 on mobile, 4 in a row from `sm`. Each is a real `<a>`.
- [ ] **AC-3:** On desktop: Instagram opens the DM thread, X opens the DM composer with the prefilled text, LinkedIn opens the profile, Mail opens Gmail compose with subject and body. On a phone: Mail opens the mail app via `mailto:`.
- [ ] **AC-4:** The copy icon copies the address and shows a toast; it's not nested inside the Mail link.
- [ ] **AC-5:** The note tile expands in place into the composer (no modal); counter enforces 80; name optional; Esc/Cancel collapses.
- [ ] **AC-6:** Publishing a valid note: spinner → note flies from the composer into the top-left slot, others shift, count increments, "· you" shows. Reload → note persists; a second browser sees it.
- [ ] **AC-7:** Wall shows ≤ 25 notes, newest top-left, 3 per row at `md`+, 2 at `sm`, 1 below. 2.5 rows visible; fade and "Scroll to view" appear only when there's more, and disappear after scrolling.
- [ ] **AC-8:** Abuse checks via `curl`: 4th post in an hour → 429; honeypot filled → 201 but nothing in Redis; URL → 400; reserved name → 400; 81 characters → 400; an obviously abusive note → 422.
- [ ] **AC-9:** With Redis env vars removed, the card renders, channels work, wall shows the offline state, nothing throws.
- [ ] **AC-10:** No response body from `/api/notes` contains upstream error text.
- [ ] **AC-11:** Reduced motion on: no flight animation, note fades in.
- [ ] **AC-12:** At 375px: no horizontal page scroll, wall scroll doesn't trap the page, composer usable with the keyboard open.
- [ ] **AC-13:** Before release, Jeet has replaced every `{{FILL: …}}` placeholder (the Upstash env vars in Vercel). The assistant's prompt lists the new socials via `socialsText`. With placeholders still empty, the card degrades as in the placeholder table, and `grep -r "{{FILL" src` finds nothing.
- [ ] **AC-14:** Asking the assistant "how do I reach you on Instagram?" or "can I leave a note?" fires `getContact`, with at most one line of text under the card.
- [ ] **AC-15:** `pnpm build` succeeds and `pnpm lint` reports no new errors in the files in Scope. No changes outside Scope.
- [ ] **AC-16:** After 2+ visitor messages, "✨ Draft my email from this chat" appears. Clicking it shows an editable preview whose content reflects the conversation, with no invented details, prices or placeholders. Open in Gmail and Open in Mail open compose with the edited text, and nothing is popup-blocked. With only the contact message, the button is absent.
- [ ] **AC-17:** The draft endpoint returns 429 on its 6th call within an hour from one IP, and 503 with Redis unset. In both cases the UI falls back to the static template.
- [ ] **AC-18:** (removed in rev. 3) No notification code ships. `grep -ri telegram src .env.example` finds nothing.
- [ ] **AC-19:** With Redis configured, the 13th chat message within a minute from one IP returns 429 even across instances (verify on a Vercel preview). With Redis unset, the in-memory limiter still applies locally. A forced Redis error doesn't block chat.

---

## 7. Decision log

- **rev. 1 → rev. 2 (2026-10-22):** the three open items were approved and moved into scope:
  - AI-drafted email → option A (a button in the card, after ≥ 2 visitor messages) → FR-9, §3.5.
  - New-note notification → Telegram → FR-10.
  - Chat rate limiter → Upstash, with in-memory fallback → FR-11.
- Inputs only Jeet can supply (handles, X user id, Upstash credentials) are `{{FILL: …}}` placeholders that he fills in manually. See the table at the top.
- **rev. 2 → rev. 3 (2026-10-22):** filled in the handles: Instagram `jeet.k_`, X `JeetKalita719`, LinkedIn `jeetkalita`. X user ID `1641144910240677888`. X DMs are confirmed open to everyone. Upstash Redis has been created, and its keys are set in `.env.local` and Vercel. All of Jeet's inputs are now provided. **The Telegram notification (FR-10) is dropped**, because Jeet doesn't want to be reached through Telegram. This removes `notify.ts`, the Telegram env vars, E-34's failure case and AC-18.
- Rejected options: a modal composer (replaced by expand-in-place), a marquee wall (replaced by a scrollable grid), sign-in to post, optimistic note insertion, and the AI draft opening the mail client directly without a preview (blocked by C-11).
