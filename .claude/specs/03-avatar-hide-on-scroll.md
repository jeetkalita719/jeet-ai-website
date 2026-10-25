# Spec: Chat header avatar — fade out on scroll so it stops covering the conversation

Status: Implemented (rev. 3: line refs corrected to `chat.tsx:191` header / `chat.tsx:232` scroll container; FR-7 also re-syncs on `AnimatePresence` `onExitComplete`) · Owner: Jeet Kalita · Date: 2026-10-26
Scope: `src/components/chat/chat.tsx` (only file modified)

---

## 1. Problem statement

On `/chat`, the doodle avatar (`DoodleAvatar`, wrapped by the local `Avatar` component) sits centered at the top of the page. When the answer is short, this looks right: the avatar is a header above the conversation. When the answer is long (e.g. the Contact card with the notes wall) and the visitor scrolls down, the avatar stays pinned at the top and is drawn **on top of** the content: in the bug screenshot it covers the "LinkedIn · Connect" tile. The text under it can't be read.

**Root cause.** The avatar lives inside a `position: fixed` header (`chat.tsx:208`, `fixed top-0 right-0 left-0 z-50`). The conversation scrolls inside a different element: the `flex-1 overflow-y-auto` div in the main content area (`chat.tsx:243`). The page itself (`h-screen overflow-hidden`) never scrolls. Nothing connects the two: the header has no idea how far the chat is scrolled, so it renders the avatar the same way at every scroll position. The scroll container's `paddingTop` (`headerHeight`, 100px or 180px) reserves space for the avatar only at scroll position 0; once that padding scrolls away, content slides under the fixed header.

> `SimplifiedChatView` (`simple-chat-view.tsx`) also declares `overflow-y-auto` on an `h-full` div, but its ancestors (`<div className="pb-4">`) have no fixed height, so `h-full` resolves to `auto` and that div never scrolls. The `chat.tsx:243` div is the only real scroll container. Confirm this in DevTools during implementation (AC-9).

**Smaller defect found during the investigation (same component), fixed in this change as FR-5:**
- The fixed header is a full-width box with a gradient background. Like any element with a background, it receives pointer events, so it **swallows clicks** on whatever content has scrolled underneath it. With a compact avatar (`pt-6` + 64px) that's the top ~88px of the viewport; with the large avatar it's ~160px. In the bug screenshot, the Instagram / X / LinkedIn / Mail tiles under the header can't be clicked. This gets worse once the avatar is invisible: an empty-looking area that still blocks clicks.

**Goal.** Keep the avatar as a header above the chat while the visitor is at (or very near) the top of the conversation. As soon as they scroll down, fade it out smoothly so it no longer covers the text, and bring it back only when they return to the top. Decisions taken with Jeet for this spec:
- **Trigger:** "near the top only". The avatar does not reappear on a small scroll up in the middle of the conversation (no "headroom" pattern).
- **Animation:** fade + slide up.
- **Gradient band:** looks exactly as it does today (height, colours, always visible).
- **Click pass-through (rev. 2):** the header, gradient band included, stops intercepting clicks. Content scrolled underneath it is clickable again (FR-5). Only the visible avatar and the pending user bubble inside the header still take pointer events.
- **Home link** (top right): stays visible, unchanged.

---

## 2. Functional requirements

### FR-1: Avatar visibility follows the chat's scroll position
- The visibility source is the `scrollTop` of the chat scroll container (`chat.tsx:243`), never `window` scroll: the window doesn't scroll on this page.
- Visibility is a boolean `showAvatar` with hysteresis so it can't flicker at the boundary (trackpad momentum, sub-pixel scroll):
  - Visible → hidden when `scrollTop > AVATAR_HIDE_AT` (48px).
  - Hidden → visible when `scrollTop <= AVATAR_SHOW_AT` (16px).
  - Between 16 and 48px, keep the current state.
- Initial state is visible.
- If the content doesn't overflow (short answer, loading bubble, landing view), `scrollTop` is always 0 and the avatar is always visible. This matches today's behaviour for short chats.

### FR-2: Fade + slide-up animation
- Hiding: opacity 1 → 0 while moving up 16px (`y: 0 → -16`). Showing: the reverse.
- Duration ~250ms, `easeOut`, via Framer Motion (`motion.div` with `animate`), consistent with the 300ms `easeOut` `MOTION_CONFIG` already used in this file.
- The animation lives on a **new wrapper element** around `<Avatar>`, not on `Avatar`'s own root div. That div already has `transition-all duration-300` for the 112px ↔ 64px size change, and a CSS `transition-all` on the element Framer animates would also transition the inline `transform`/`opacity` and double-ease them (see C-4).
- The existing size behaviour (`hasActiveTool` → 64px, otherwise 112px) and the talking animation (`isTalking`) are unchanged and work in both states.

### FR-3: No layout shift
- When the avatar hides, it keeps its box: the header's height, the gradient band and the scroll container's `paddingTop` (`headerHeight`) stay the same. Only opacity and transform change. Nothing below moves.
- Don't unmount the avatar when hidden (no `AnimatePresence` exit). The `DoodleAvatar` SVG is cheap, and keeping it mounted means it fades back in instantly with its blink/bob CSS animations still in phase.

### FR-4: Hidden avatar is inert
- While hidden, the avatar wrapper gets `pointer-events-none` and `aria-hidden="true"`, so an invisible avatar can't be clicked (its click handler navigates to `/`) and screen readers don't announce it.
- While visible, its click-to-home behaviour is unchanged.

### FR-5: The header no longer swallows clicks on content underneath
- The fixed header container gets `pointer-events-none`. The elements inside it that must stay interactive opt back in with `pointer-events-auto`:
  - the avatar wrapper, **only while visible** (FR-4);
  - the pending user-message bubble (`latestUserMessage && !currentAIMessage`), so text selection inside it keeps working.
- The gradient band itself keeps painting exactly as it does today (per Jeet's decision). It just lets clicks and wheel/touch scrolls through to the content underneath.
- The Home link is a sibling of the header (`absolute top-6 right-6 z-[51]`), not a child, so it isn't affected.

### FR-6: Reduced motion
- Read `useReducedMotion()` from `framer-motion` (already a dependency). When it returns true, animate opacity only (no `y` offset) and use a shorter duration (~150ms). The avatar still hides and shows; it just doesn't move.

### FR-7: Re-sync when the conversation content is swapped
- `chat.tsx` replaces the scroll container's content on every exchange (landing → loading bubble → `SimplifiedChatView`). When the content shrinks, the browser clamps `scrollTop`, and the avatar must reflect the clamped value.
- Besides the `onScroll` handler, re-read `scrollRef.current.scrollTop` and re-apply the FR-1 rule in an effect that runs when `currentAIMessage?.id`, `loadingSubmit` or `isEmptyState` changes. This covers browsers that don't fire `scroll` on clamping.
- Because the content `AnimatePresence` uses `mode="wait"`, the outgoing content stays in the DOM for its 300ms exit animation, so the effect above alone would read the old `scrollTop`. The content `AnimatePresence` therefore also gets `onExitComplete={() => setContentSwaps((n) => n + 1)}`, and `contentSwaps` is a dependency of the re-sync effect. That way it re-reads `scrollTop` after the old node has actually been removed.

### Non-goals
- No visual change to the gradient band (height, colours, stops) or to `headerHeight`. Its only change is that it no longer intercepts clicks (FR-5).
- No change to the Home link.
- No "show on scroll up" (headroom) behaviour.
- No change to `DoodleAvatar` (`doodle-avatar.tsx`), its sizes or its talking/idle animations.
- No change to `SimplifiedChatView`, `ChatBottombar`, `HelperBoost` or any card component.
- No change to the avatar's click behaviour (`window.location.href = '/'`, not keyboard-focusable). Turning it into a proper `<Link>` is a separate change.
- No change to how the chat scrolls (no scroll-to-top-on-submit, no auto-scroll while streaming).
- No light-theme work (the site is forced dark).

---

## 3. API contracts (inputs, outputs, data shapes)

No HTTP, LLM tool or `profile.ts` contract changes. The contracts below are internal to `chat.tsx`.

### 3.1 Constants (module scope in `chat.tsx`)

```ts
const AVATAR_HIDE_AT = 48; // px of chat scroll after which the avatar hides
const AVATAR_SHOW_AT = 16; // px of chat scroll at or below which it shows again
```

`AVATAR_SHOW_AT < AVATAR_HIDE_AT` must hold. The gap between them is the hysteresis band.

### 3.2 State and refs in `Chat`

```ts
const scrollRef = useRef<HTMLDivElement>(null);  // the chat.tsx:243 scroll container
const [showAvatar, setShowAvatar] = useState(true);
const prefersReducedMotion = useReducedMotion();
```

Shared update rule, used by both the `onScroll` handler and the FR-7 effect:

```ts
const syncAvatar = (scrollTop: number) =>
  setShowAvatar((prev) =>
    prev ? scrollTop <= AVATAR_HIDE_AT : scrollTop <= AVATAR_SHOW_AT
  );
```

- **Input:** `scrollTop` (px, ≥ 0) of `scrollRef.current`.
- **Output:** `showAvatar: boolean`. React skips the re-render when the value doesn't change, so continuous scrolling only re-renders `Chat` at the two crossing points.

### 3.3 Avatar wrapper (inside the header, around the existing `<ClientOnly><Avatar … /></ClientOnly>`)

```tsx
<motion.div
  aria-hidden={!showAvatar}
  className={showAvatar ? 'pointer-events-auto' : 'pointer-events-none'}
  initial={false}
  animate={
    prefersReducedMotion
      ? { opacity: showAvatar ? 1 : 0 }
      : { opacity: showAvatar ? 1 : 0, y: showAvatar ? 0 : -16 }
  }
  transition={{ duration: prefersReducedMotion ? 0.15 : 0.25, ease: 'easeOut' }}
>
```

- `initial={false}`, so the first paint shows the avatar in its resting state with no entrance animation (same as today).
- The `Avatar` component's props (`hasActiveTool`, `isTalking`) are unchanged.

### 3.4 Scroll container

```tsx
<div
  ref={scrollRef}
  onScroll={(e) => syncAvatar(e.currentTarget.scrollTop)}
  className="flex-1 overflow-y-auto px-2"            // unchanged
  style={{ paddingTop: `${headerHeight}px` }}        // unchanged
>
```

### 3.5 Header container and pending bubble (FR-5)

```tsx
<div
  className="pointer-events-none fixed top-0 right-0 left-0 z-50"  // + pointer-events-none
  style={{ background: /* unchanged gradient */ }}
>
  …
  <motion.div
    {...MOTION_CONFIG}
    className="pointer-events-auto mx-auto flex max-w-3xl px-4"   // + pointer-events-auto
  >
    {/* pending user bubble, unchanged */}
  </motion.div>
</div>
```

- `pointer-events-none` is inherited by every descendant that doesn't override it. The only overrides are the avatar wrapper (while visible, §3.3) and the pending bubble.
- The Home link is a sibling of this container, so it isn't affected.

---

## 4. Constraints

- **C-1: Stack.** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4 (CSS-first, no `tailwind.config.js`), `framer-motion@^12` (already imported in `chat.tsx`). Prettier: single quotes, semicolons, `es5` commas. No new dependencies.
- **C-2: Forced dark theme.** Don't add a light/system toggle.
- **C-3: The window never scrolls.** The root is `h-screen overflow-hidden`; the chat scrolls in its own div. Don't use `window.scrollY`, a `window` scroll listener, or Framer's `useScroll()` without a `container`. They would always read 0.
- **C-4: Framer Motion owns transforms on motion elements.** Framer writes an inline `transform`/`opacity` on the element it animates. Don't put that `motion.div` on an element that also has a Tailwind `transition-all` / `transition-transform` (`Avatar`'s root has `transition-all duration-300`), or the CSS transition will re-ease Framer's per-frame values. Use a separate wrapper (FR-2).
- **C-5: Performance.**
  - The scroll handler only reads `scrollTop` (no `getBoundingClientRect`, no layout reads) and calls a functional `setState` that bails out when unchanged. No `requestAnimationFrame` throttle needed.
  - Animate only `opacity` and `transform` (compositor-friendly). Don't animate `height`, `margin` or `padding`.
  - The header's `background` gradient is unchanged; no `backdrop-filter` is added.
- **C-6: No layout shift** (FR-3). `headerHeight` and the header's padding classes keep their current values and their `hasActiveTool` dependency.
- **C-7: Hydration.** `Avatar` is already inside `ClientOnly`. `showAvatar` starts as `true` on both server and client, and `useReducedMotion()` returns `null` on the server. Both are hydration-safe.
- **C-8: Single file.** All changes are in `src/components/chat/chat.tsx`.

---

## 5. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| E-1 | Short answer, content fits the viewport | No overflow, `scrollTop` stays 0, avatar always visible. Identical to today. |
| E-2 | Long answer (Contact card + notes wall, Projects carousel + long text), scroll down past 48px | Avatar fades and slides up out of view within ~250ms. Content under the header is readable and clickable. |
| E-3 | Scroll back up to ≤ 16px | Avatar fades and slides back in. |
| E-4 | Stop scrolling between 16px and 48px | Avatar keeps whatever state it had. No flicker while hovering at the boundary or during trackpad momentum. |
| E-5 | Scroll up a little in the middle of a long answer | Avatar stays hidden (no headroom behaviour). |
| E-6 | Scrolled down, then send a new question (input or quick-question chip) | Content is replaced by the short loading bubble, `scrollTop` clamps to 0, the avatar fades back in (FR-7), and the pending user bubble shows under it as today. |
| E-7 | New answer streams in while the avatar is visible | The answer grows, but `scrollTop` doesn't change, so the avatar stays visible until the visitor scrolls. |
| E-8 | `hasActiveTool` flips while hidden (112px ↔ 64px) | Size changes invisibly. When the avatar reappears it's already the correct size, with no layout jump in the content (`headerHeight` behaves as today). |
| E-9 | Assistant is "talking" while the avatar is hidden | Talking state still updates; the mouth animation is simply not visible. When it reappears, it shows the current state. |
| E-10 | Click where the hidden avatar used to be | The click reaches the content underneath (FR-4, FR-5). It does **not** navigate to `/`. |
| E-11 | Click a tile that has scrolled under the gradient band, avatar hidden or visible | The tile receives the click (FR-5). The visible avatar itself still navigates to `/`. |
| E-12 | Keyboard scrolling (PageDown, Space, arrow keys, Tab moving focus into a card lower down) | Same as mouse scroll: `onScroll` fires and the same thresholds apply. |
| E-13 | Mobile (375px), touch scroll with momentum | Same behaviour. Hysteresis prevents flicker during momentum. The page doesn't scroll horizontally. |
| E-14 | `prefers-reduced-motion` | Opacity-only fade (~150ms), no slide (FR-6). |
| E-15 | Landing view (no messages) on a short viewport where `ChatLanding` overflows | Same rule applies: scrolling it hides the avatar, and returning to the top shows it. Acceptable, consistent with the chat. |
| E-16 | Window resize or rotation changes overflow so `scrollTop` is clamped to 0 | If the browser fires `scroll`, the avatar shows. If it doesn't, the avatar shows on the next content change (FR-7) or next scroll. Acceptable. |
| E-17 | Home link | Unchanged: always visible and clickable, above the header (`z-[51]`). |

---

## 6. Acceptance criteria

- [ ] **AC-1:** Run `pnpm dev`, ask a question with a short answer: the avatar is visible above the chat exactly as in the "fine" screenshot (Image 1).
- [ ] **AC-2:** Ask "how can I contact you" (or anything that renders the Contact card + notes wall), then scroll down: the avatar fades out while moving up and no longer covers any tile or text. Compare against the bug screenshot (Image 2).
- [ ] **AC-3:** Scroll back to the very top: the avatar fades back in. Scrolling up only partway in the middle of the answer does not bring it back.
- [ ] **AC-4:** Scroll slowly back and forth around 16–48px (and flick-scroll on a trackpad): no flicker.
- [ ] **AC-5:** With the avatar hidden, click the spot where it was: nothing navigates, and any content underneath gets the click. With the avatar visible, clicking it still goes to `/`.
- [ ] **AC-6:** Scroll so a Contact tile sits under the gradient band at the top: clicking it opens its link (FR-5). The gradient band looks identical to before.
- [ ] **AC-7:** Hiding and showing causes no layout shift: the content doesn't jump, and the header height and gradient stay the same. Check with the Performance panel's Layout Shift track (CLS stays 0 during scroll).
- [ ] **AC-8:** With reduced motion enabled (OS or DevTools "Emulate CSS prefers-reduced-motion"), the avatar fades without sliding.
- [ ] **AC-9:** In DevTools, confirm the `chat.tsx:243` div is the element whose `scrollTop` changes, and that the `SimplifiedChatView` inner div never scrolls.
- [ ] **AC-10:** Scrolled down on a long answer, send a new question: the avatar reappears with the pending user bubble under it (E-6).
- [ ] **AC-11:** At a 375px viewport with touch emulation: same behaviour, no horizontal page scroll.
- [ ] **AC-12:** The Home link is visible and clickable at all scroll positions.
- [ ] **AC-13:** `pnpm build` succeeds, and `pnpm lint` reports no new errors in `chat.tsx`. The diff touches only `src/components/chat/chat.tsx`.
