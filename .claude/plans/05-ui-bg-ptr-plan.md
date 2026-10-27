# Plan 05: Site-wide fluid pointer glow, faded under cards and reply text

Spec: `.claude/specs/05-ui-bg-ptr.md` (rev. 1). The repo copy of this plan goes in `.claude/plans/05-ui-bg-ptr-plan.md`.

## Context

The WebGL fluid glow (`FluidCursor` → `src/hooks/use-FluidCursor.tsx`) is only rendered by the landing page (`src/app/page.tsx:125`). It disappears on `/chat`. Every `/` ↔ `/chat` round trip also leaks a running rAF loop and 7 listeners, because the hook has no teardown. This change:
- mounts one simulation in the root layout for the app's lifetime;
- adds dispose and a single-start guard;
- degrades gracefully when WebGL is missing;
- protects readability on `/chat` with 90% card surfaces and a feathered `.glow-scrim` behind text that has no surface.

**Verified in the repo (2026-10-27):** every file:line reference in the spec matches the current code. Exactly 7 `addEventListener` calls exist in the hook (`:1129–1209`). `update()` is at `:906` and calls `requestAnimationFrame(update)` with the id discarded. The only consumer is `FluidCursor.tsx`. `Card` primitive = `bg-card … rounded-xl border` (`ui/card.tsx:10`). `received` bubble has no background (`chat-bubble.tsx:89`). `tsconfig` is `strict` without `noImplicitReturns`, so a `try { return dispose } catch {}` effect type-checks.

**Formatting baseline:** `prettier --check` fails on 13 of the 17 in-scope files. Only `FluidCursor.tsx`, `use-FluidCursor.tsx`, `simple-chat-view.tsx` and `contact.tsx` are clean. **Don't run `prettier --write` on the dirty files**, because it would reformat whole files (e.g. `AllProjects.tsx` uses double quotes, and `chat.tsx` has mis-indented JSX). Hand-place new classes in `prettier-plugin-tailwindcss` order (layout → spacing → sizing → bg → …), matching the neighbours. Prettier may be run on the 4 clean files.

**Lint baseline (errors):** `use-FluidCursor.tsx` 69 (mostly pre-existing `prefer-const`), `chat.tsx` 3, `tool-renderer.tsx` 1, `chat-landing.tsx` 1, `chat-bottombar.tsx` 1, all other in-scope files 0. AC-14 means these counts must not increase.

---

## Step 0: Save the plan into the repo
Copy this plan to `.claude/plans/05-ui-bg-ptr-plan.md` (same convention as `01-cards-ui-fix-plan.md`).

## Step 1: Lifecycle in `src/hooks/use-FluidCursor.tsx` (FR-3, C-4)
Minimal-diff edits only. Keep `// @ts-nocheck`, the name, `config`, the shaders, and the existing `let`s inside handler bodies (don't "fix" `prefer-const` on untouched lines).
1. Signature `const useFluidCursor = (): (() => void) => {`.
2. Next to `lastUpdateTime`/`colorUpdateTimer` (`:903`), add `let rafId = 0; let started = false; let disposed = false;`.
3. `update()`: first line `if (disposed) return;`; last line `rafId = requestAnimationFrame(update);`.
4. Add `function start() { if (started) return; started = true; update(); }` right after `update()`.
5. Convert the 5 anonymous handlers to named function declarations placed where they are now. Each `window.addEventListener('x', (e) => {` becomes `function handleX(e) {`, with the body unchanged, followed by `window.addEventListener('x', handleX);`. Names: `handleMouseDown`, `handleMouseMove`, `handleTouchStart`, `handleTouchMove` (keep the `false` option), `handleTouchEnd`. Hoist `handleFirstMouseMove`/`handleFirstTouchStart` the same way, keeping their self-removal.
6. In both "first input" handlers, replace `update();` with `start();` (`:1143`, `:1169`; inside the touch loop is fine because of the guard).
7. Just before the closing `};` (`:1329`), return an idempotent dispose: set `disposed = true`, `cancelAnimationFrame(rafId)`, then `removeEventListener` for all 7 with the same target and options. That's `document.body` for the two "first" handlers and `false` for touchmove. No `WEBGL_lose_context` (StrictMode reuses the context).

## Step 2: `src/components/FluidCursor.tsx` (FR-2, FR-4)
Implement exactly as spec §3.2: the effect does `try { return fluidCursor(); } catch (err) { console.warn('FluidCursor: WebGL unavailable, background effect disabled', err); }`. The wrapper is `<div aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-0">`, and the canvas is unchanged.

## Step 3: Mount once (FR-1)
- `src/app/layout.tsx`: import `FluidCursor` and render `<FluidCursor />` between `<main>` and `<Toaster />`.
- `src/app/page.tsx`: delete the import (`:4`) and `<FluidCursor />` (`:125`). The landing stacking is unchanged: its flex children are `z-1`/`z-10` above the canvas's `z-0`, and the footer word stays below it as before.

## Step 4: Scrim CSS in `src/app/globals.css` (FR-6, §3.3)
Append the `@layer components { .glow-scrim … .glow-scrim::before … }` block verbatim from spec §3.3, after `@layer base`. It's plain CSS in a native cascade layer, which Tailwind v4 declares via `@import "tailwindcss"`.

## Step 5: `/chat` layering, clips and bottom bar (FR-2, FR-7, FR-8, §3.6)
- `chat.tsx:216`: `relative z-10 h-screen overflow-hidden`.
- `chat.tsx:326`: drop `bg-background` → `sticky bottom-0 px-2 pt-3 md:px-0 md:pb-4`.
- `simple-chat-view.tsx:64`: `flex h-full w-full flex-col` (drop `custom-scrollbar` and `overflow-y-auto`).
- `tool-renderer.tsx:33`: `className="w-full"`; `:39` fallback `bg-secondary/10` → `bg-card/90`.
- `chat-bottombar.tsx:58`: `bg-accent` → `bg-accent/90`.

## Step 6: Card tints (FR-5, §3.4): class swaps only
| File:line | Change |
|---|---|
| `skills.tsx:56` | `Card` className adds `bg-card/90` (tailwind-merge overrides the primitive's `bg-card`) |
| `services.tsx:27`, `fun.tsx:11`, `resume.tsx:15`, `contact.tsx:64` | `bg-accent` → `bg-accent/90` on the outer surface |
| `chat-landing.tsx:78` | `bg-accent hover:bg-accent/70` → `bg-accent/90 hover:bg-accent/80` |

Nested surfaces (Contact tiles/notes/draft panel, Services icon chips and tool tags, badges), `presentation.tsx:28` photo frame, carousel faces, modal, and HelperBoost chips stay untouched.

## Step 7: Scrim hosts (FR-6, §3.5)
- `simple-chat-view.tsx:77`: reply wrapper `className="glow-scrim w-full"`.
- `presentation.tsx:58`: `className="glow-scrim flex flex-col"`.
- `services.tsx:18–19`: wrap the `h2` and `p` in `<div className="glow-scrim mb-6">`, and remove `mb-6` from the `p` (keep `mt-1`).
- `AllProjects.tsx:13`: `h2` drops `max-w-7xl mx-auto` and adds `glow-scrim w-fit` (keep the file's double quotes and existing class order style).
- `chat-landing.tsx:66–71`: wrap `motion.h2` and `motion.p` in `<div className="glow-scrim flex w-fit max-w-full flex-col items-center">`. The stagger variants still propagate through a plain `div`. The `mt-8` grid stays outside the wrapper.

Feather room check: the nearest horizontal clip is the scroll container `chat.tsx:285` (`px-2`), plus `px-4` in `SimplifiedChatView`, which gives 24px > 16px bleed. The vertical bleed of Presentation's column sits in `gap-10`, and the chat-landing wrapper sits inside `py-6`. The pending-user and loading bubbles get no scrim.

## Step 8: Static checks
1. `pnpm exec prettier --check src/components/FluidCursor.tsx src/hooks/use-FluidCursor.tsx src/components/chat/simple-chat-view.tsx src/components/contact.tsx`. These were clean before and must still be clean; fix by hand if not.
2. Rerun the per-file ESLint error count. Each file must be ≤ its baseline, and `use-FluidCursor.tsx` stays at 69 or lower (new code uses `const`).
3. `pnpm build` succeeds (type check included).
4. `git diff --stat` touches only Scope files (+ the plan copy). Review the `use-FluidCursor.tsx` hunk to confirm it's only the FR-3 lines.

## Verification (AC-1 … AC-13), in `pnpm dev` + Chrome (claude-in-chrome)
- **AC-1/2/6:** `/` looks as before. Click **Skills** → on `/chat`, the glow follows the cursor over gutters, card, reply and bottom bar. `document.querySelectorAll('canvas#fluid').length === 1` on both routes. The wrapper has `pointer-events: none` and `aria-hidden`.
- **AC-3/4/7:** visually check Skills, Contact, Services, Fun, Resume and Me under bright swirls. The scrim has no box edge at the column edges (desktop and 375px). The input pill and suggestions are 90%/80% on hover. There's no black strip at the bottom.
- **AC-5:** text selection in a reply, link clicks, wheel scroll, the Home link, chips and the input all work.
- **AC-8:** DevTools touch emulation → first tap starts the effect at normal speed.
- **AC-9:** `/` → `/chat` → Home → `/chat` with the mouse moving. `getEventListeners(window).mousemove.length` stays constant, and the Performance panel shows one `update` rAF per frame.
- **AC-10:** with the Projects carousel and then a modal open, no long tasks over 50ms. Note the result for E-12.
- **AC-11:** run the page with `HTMLCanvasElement.prototype.getContext = () => null` injected before hydration, or launch Chrome with `--disable-webgl`. Expect one console warning, both routes working, and a plain background.
- **AC-12/13:** the avatar fade-on-scroll is unchanged. At 375px there's no horizontal scroll and the carousel still clips inside its track.
- Spot-check E-10 (StrictMode in dev): after reload, exactly one loop runs (the speed matches the production build).

---

## Verification results (2026-10-27)

Run against a production build (`next build` + `next start -p 3001` on a copy of the working tree), because the long-running `:3000` dev server was serving a broken bundle (`main-app.js`/`polyfills.js` 404, no hydration).

- **Build/types/lint:** `next build` passes, `tsc --noEmit` is clean, and per-file ESLint error counts equal the baseline (use-FluidCursor 69, chat 3, tool-renderer 1, chat-landing 1, chat-bottombar 1).
- **AC-1/2/6:** the glow on `/` is unchanged. After clicking a chip, the glow continues on `/chat` with no reset. There's one `canvas#fluid`, and its wrapper has `pointer-events: none` and `aria-hidden="true"`.
- **AC-3/4/7:** cards are at 90% (`oklab(... / 0.9)`). The scrim `::before` is 85%, inset −16px and masked. Bright swirls are dimmed behind the reply with no visible edge. The bottom bar is transparent, and the glow shows around the pill.
- **AC-5:** `elementFromPoint` on the input, the Home link and the reply text hits those elements, never the canvas.
- **AC-8/E-9:** a two-finger first `touchstart` + compat `mousemove` gives 1.00 rAF per frame.
- **AC-9/E-3:** `/` → `/chat` → Home → `/chat` stays at 1.00 rAF per frame. Fluid listeners: zero adds after load, and only the two "first input" self-removals.
- **AC-11:** with `getContext → null` injected, there's one `FluidCursor: WebGL unavailable…` warning and the app hydrates and works.
- **AC-13** (371px iframe): `scrollWidth == innerWidth`. The reply scrim has 24px of room on the left, and the carousel track scrolls internally (1968 / 308).
- **AC-10/E-12:** with the modal open, ~48 fps and no long tasks. With the carousel on screen, ~19–35 fps with repeated 50–150 ms long tasks, **identical with the fluid's GL context lost**. The jank comes from the carousel's dotted-glow canvases, not from this change. Possible follow-up: throttle or pause the off-screen dotted-glow canvases.
