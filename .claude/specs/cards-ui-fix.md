# Spec: Project carousel cards — fix overlapping text and refresh the card face

Status: Draft (rev. 2) · Owner: Jeet Kalita · Date: 2026-10-21
Scope: `src/components/projects/*`, `src/lib/profile.ts` (data only), `src/components/ui/dotted-glow-background.tsx` (consumed, not modified), `src/components/dotted-glow-background-demo.tsx` (deleted)

---

## 1. Problem statement

When the assistant calls `getProjects`, the chat renders `AllProjects` → an Apple-style carousel of cards (`apple-cards-carousel.tsx`). The card faces are unreadable: titles appear twice, clipped and on top of each other ("This website" over "site", "Job-Intelligence Agent" over "ligence Agent").

**Root cause.** Every cover in `public/covers/*.svg` is a 1200×675 (16:9, landscape) image with the title and subtitle drawn into the SVG as `<text>`. The card face is 224×320 (`w-56 h-80`, portrait) and renders the cover with `object-cover`: the image scales to ~569px wide, so only the middle ~39% of its width shows. The baked-in title (drawn from x=80) is cut off at both edges. The card then draws its own HTML `category` + `title` overlay (`text-3xl` in a 224px-wide box) on top, and the two layers of text collide.

**Current working tree.** An uncommitted change in `apple-cards-carousel.tsx` removes the HTML overlay. That stops the overlap, but the card is still broken: the only text left is the cropped text inside the SVG, so the title is clipped and you can't read it, and the shared-element `layoutId` animation into the modal has nothing to animate from.

> The working tree also has uncommitted changes that are **unrelated to this feature**: `src/app/page.tsx` (landing-page chip glow), `.gitignore` and `pnpm-workspace.yaml`. They are out of scope. Don't include them in this change's commit.

**Smaller defects found during the investigation (all in the same component):**
- `layoutId` mismatch (as of `HEAD`): the face uses `category-${card.category}` and the modal uses `category-${card.title}`, so the category never animates between them.
- Pressing Esc closes every card, and the carousel jumps to its last card. Each `Card` registers a window `keydown` listener whether or not it is open (`apple-cards-carousel.tsx:201`). Pressing Esc anywhere on the page, including in the chat input, calls `handleClose()` → `onCardClose(index)` on all 8 cards, so the carousel scrolls to index 7. The same effect also writes `document.body.style.overflow = 'auto'` on every card mount.
- The carousel nav buttons are `bg-gray-100` with a `text-gray-500` icon. That's a light-theme style on a site that is forced dark, and it shows as a grey blob in the screenshot.
- The face is a `motion.button` with no visible focus style and no accessible name beyond the image `alt`. The modal has no dialog semantics, doesn't move focus, and its close button has no accessible name.

**Goal.** Fix the card face so the text renders once, in HTML, and you can read it. Keep it visually consistent with the rest of the site (dark zinc/neutral, `rounded-3xl`, per-project hue gradients, the dotted texture the covers already use). Borrow a few elements from the Aceternity *Dotted Glow Background* card without copying it outright.

---

## 2. Functional requirements

### FR-1: Text is rendered once, in HTML
- The card face must not show any text that comes from the cover image. Remove `<BlurImage>` from the face entirely, and delete the `BlurImage` export, which has no other users (`Data.tsx` uses `next/image` directly).
- Category, title and tagline are HTML elements on the face.
- The cover SVGs stay as they are. They are still used, at their native 16:9 ratio, at the bottom of the expanded modal (`Data.tsx`), where nothing gets cropped.

### FR-2: Card face layout (keeps the existing shape)
Keep: `h-80 w-56`, `rounded-3xl`, `overflow-hidden`, the left-aligned text column, the staggered entrance animation, and the click-to-expand modal.

From top to bottom:
1. **Category**: `text-sm font-medium`, white at about 80% opacity, single line, truncated.
2. **Title**: `text-xl font-semibold text-white [text-wrap:balance] break-words`, at most 3 lines (`line-clamp-3`). It must fit inside the 224px card with `p-6` padding (176px of content width). Use a single size at every breakpoint: the card doesn't change size, so a `md:` bump adds nothing. At 24px, the longest word ("Recommendation") is roughly 185px wide and would overflow. No `text-2xl` or `text-3xl`.
3. **Spacer**: `flex-1`.
4. **Footer row** (from the inspiration): the tagline on the left (`text-xs`, hue-tinted, at most 2 lines) and an arrow on the right (`→` or `IconArrowNarrowRight`). The row sits on `backdrop-blur-[2px]` so it stays legible over the dots.

### FR-3: Per-project background (consistent with the current covers)
- Background is a linear gradient from `hsl(H 60% 12%)` to `hsl(H 70% 26%)`, the same formula the cover SVGs use. Here it runs top to bottom (the covers run diagonally).
- `H` is a new per-project `hue` field (see §3). It is applied through an inline CSS custom property (`style={{ '--card-hue': hue }}`), not through dynamically built Tailwind class names.
- Above the gradient, add a top-down `from-black/60 via-transparent` scrim so the title has contrast. This replaces the old full-height `from-black` gradient.

### FR-4: Animated dotted texture (from the inspiration)
- Render `<DottedGlowBackground>` inside each card, behind the text (`z-0`, `pointer-events-none`). It replaces the static dot pattern that is baked into the SVG.
- Suggested props: `gap={18}`, `radius={1.4}`, `opacity={0.9}`, `backgroundOpacity={0}`, `speedMin={0.3}`, `speedMax={1.4}`. A gap of 18–20px matches the covers' dot spacing as it appeared on the card (40 SVG units × 0.474 ≈ 19px), and draws about 60% fewer dots than `gap={12}` (see C-5).
- Colors come from CSS variables set on the card, which the component resolves through `getComputedStyle` on its container:
  - `--card-dot: hsl(var(--card-hue) 80% 70% / 0.35)` → `colorDarkVar="--card-dot"`
  - `--card-glow: hsl(var(--card-hue) 90% 65%)` → `glowColorDarkVar="--card-glow"`
- A radial mask fades the dots toward the card edges (see C-3 for how to do this on Tailwind 4.0).
- While any card in the carousel is open (see §3.3, `openIndex`), don't render the dot layer on any face. Off-screen detection doesn't help here: the modal overlay hides the cards visually, but they still count as intersecting. If they kept animating, the browser would recompute the modal's `backdrop-blur-lg` every frame. The dots regenerate with new random phases when the modal closes, which is acceptable.

### FR-5: Card chrome (from the inspiration, adapted)
- Add `ring-1 ring-white/5` and `shadow shadow-white/10` (the inspiration's dark-mode values).
- On hover, lift the card slightly, brighten the ring (`hover:ring-white/15`) and nudge the arrow to the right (`group-hover:translate-x-1` on the arrow element). No `scale-110` on a full-bleed layer.
- Do the lift with Framer Motion (`whileHover={{ y: -4 }}` on the face `motion.button`), not with a Tailwind `hover:-translate-y-1`. The face has a `layoutId`, so Framer writes an inline `transform` that would override the Tailwind class (see C-9).
- Keep the `rounded-3xl` corners. Don't adopt the inspiration's asymmetric `rounded-tl-3xl rounded-br-3xl …` corners, which don't match the rest of the site.

### FR-6: Shared-element transition still works
- The face and the modal must use identical `layoutId`s: `card-${title}`, `category-${title}`, `title-${title}`.
- When the card opens, the category and title animate from the face into the modal header and back when it closes.

### FR-7: Carousel controls match the dark theme
- Prev/next buttons: `bg-neutral-800 ring-1 ring-white/10 hover:bg-neutral-700`, with the icon in `text-neutral-200`. Disabled state is `disabled:opacity-40` and `disabled:cursor-not-allowed`.
- Each button gets an `aria-label` ("Previous projects" / "Next projects").

### FR-8: Accessibility
- **Card face:** the button gets `aria-label={`Open ${title}`}` and a visible focus style, `focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60`. The ring must be inset: the first card sits against the scroll container's left edge, and `overflow-x-scroll` would clip an outer ring.
- **Canvas:** it's decorative, so set `aria-hidden` on the wrapper.
- **Reduced motion:** detect it with `useReducedMotion()` from `framer-motion` (already a dependency). When it returns true, pass `speedScale={0}` so the dots render as a static field, and pass `whileHover={undefined}` so there is no hover lift. With `speedScale={0}` the component's loop still redraws the same frame every tick. That's acceptable for this change.
- **Modal:**
  - The modal container gets `role="dialog"`, `aria-modal="true"` and `aria-labelledby` pointing at the modal title's `id`.
  - On open, move focus to the close button. On close, return focus to the card face that opened it.
  - The close button gets `aria-label="Close"`.
  - A full focus trap is a non-goal.

### FR-9: Content stays in `profile.ts`
All card text (category, title, tagline) and the hue come from `PROJECTS`. Nothing is hard-coded in the components.

### FR-10: Esc and scroll-lock apply only to the open card
- Register the `keydown` (Esc) listener only while that card is `open`, and remove it when the card closes. Pressing Esc while no card is open does nothing.
- Only change `document.body.style.overflow` when `open` changes: set it to `hidden` on open and restore it on close. Don't write it on mount.

### Non-goals
- No changes to `/api/chat`, `prompt.ts`, the `getProjects` tool or `tool-renderer.tsx`.
- No change to the modal's content layout (`ProjectContent`), apart from the `layoutId` fix and the FR-8 modal attributes.
- No regeneration of the cover SVGs.
- No light-theme work. The site is forced dark, so `dark:` values are the ones that matter.
- No Tailwind version bump (see C-3).
- No edits to the vendored `dotted-glow-background.tsx` (see C-8).
- No full focus trap in the modal.
- None of the unrelated working-tree changes (`src/app/page.tsx`, `.gitignore`, `pnpm-workspace.yaml`) are part of this change.

---

## 3. API contracts (inputs, outputs, data shapes)

No HTTP or LLM tool contract changes. The `getProjects` tool keeps empty zod params and still returns a short string. The contracts below are the component and data interfaces.

### 3.1 `Project` (`src/lib/profile.ts`): additive change

```ts
export type Project = {
  title: string;
  category: string;
  description: string;
  techStack: string[];
  date: string;
  links: { name: string; url: string }[];
  cover: string;    // path under /public, 16:9; used in the modal only
  hue: number;      // NEW, required: 0–359, the gradient hue (matches the cover SVG)
  tagline?: string; // NEW: one line for the card footer; ≤ 60 chars recommended
};
```

Values, taken from the existing cover SVGs:

| title | hue | tagline |
|---|---|---|
| This website | 205 | Chat-first portfolio · Vercel AI SDK · tool calling |
| Job-Intelligence Agent | 195 | AI agent · ATS feeds · RAG · drafts applications |
| Expense-Tracker MCP Server | 260 | FastMCP server · tools an assistant can call |
| YouTube Transcript RAG Chatbot | 350 | LangChain · OpenAI embeddings · FAISS |
| Media Groww | 18 | Video-editing agency · co-founded at BITS Goa |
| Book Recommendation System | 30 | Collaborative filtering · Flask |
| University Course Allocation | 275 | Graph optimisation · C++ · preference-aware assignment |
| Stationery system — Indian Oil | 150 | Secure internal tooling · Node.js · REST |

**Hue normalisation:** hue is a circle, so values outside 0–359 wrap around (`((h % 360) + 360) % 360`) rather than being clamped. For example, 400 becomes 40.

**Tagline fallback:** if `tagline` is absent, use `techStack.slice(0, 3).join(' · ')`. If that is empty too, hide the tagline and keep the arrow.

> `prompt.ts` builds `projectsText` from specific fields only (`title`, `category`, `date`, `description`, `techStack`, `links`), so `hue` and `tagline` don't reach the system prompt. No prompt change is needed.

### 3.2 Carousel card data

Define and export the type from `src/components/projects/apple-cards-carousel.tsx`, replacing the local `type Card`. The carousel is what consumes it.

```ts
export type CarouselCard = {
  title: string;
  category: string;
  tagline: string;          // already resolved with the fallback; may be ''
  hue: number;              // already normalised
  src: string;              // cover, for the modal
  content: React.ReactNode; // <ProjectContent project={p} />
};
```

`src/components/projects/Data.tsx` imports it (`import type { CarouselCard } from './apple-cards-carousel'`) and builds the list:

```ts
export const data: CarouselCard[] = PROJECTS.map((p) => ({ /* … */ }));
```

### 3.3 `Card` and `CarouselContext` (`apple-cards-carousel.tsx`)

```ts
<Card card={CarouselCard} index={number} layout?: boolean /* default false */ />

CarouselContext: {
  currentIndex: number;
  openIndex: number | null;          // NEW: which card's modal is open, if any
  onCardOpen: (index: number) => void;  // NEW: sets openIndex
  onCardClose: (index: number) => void; // existing; also sets openIndex to null
}
```

- **Input:** a `CarouselCard`.
- **Output:** a `motion.button` (the face, 224×320). While the card is open, it also renders the modal, which is an inline `position: fixed` overlay rendered next to the face (not a React portal).
- **Side effects, only while this card is open:** locks `document.body` scroll, closes on Esc and on a click outside, and moves focus as described in FR-8. On close it restores scroll, returns focus to the face, and calls `CarouselContext.onCardClose(index)`.

### 3.4 `DottedGlowBackground` (`src/components/ui/dotted-glow-background.tsx`), already installed

```ts
type DottedGlowBackgroundProps = {
  className?: string;
  gap?: number;               // px between dot centres (default 12)
  radius?: number;            // dot radius px (default 2)
  color?: string;             // light dot colour (default rgba(0,0,0,0.7))
  darkColor?: string;
  glowColor?: string;         // default rgba(0,170,255,0.85)
  darkGlowColor?: string;
  colorLightVar?: string;     // CSS var names, e.g. "--card-dot"
  colorDarkVar?: string;
  glowColorLightVar?: string;
  glowColorDarkVar?: string;
  opacity?: number;           // layer opacity (default 0.6)
  backgroundOpacity?: number; // radial fade (default 0)
  speedMin?: number;          // rad/s (default 0.4)
  speedMax?: number;          // rad/s (default 1.3)
  speedScale?: number;        // global multiplier; 0 = frozen frame, but the loop still redraws every tick (default 1)
};
```

- It renders an absolutely positioned `div` (`inset: 0`) containing a `<canvas>`. Its parent must be `position: relative`.
- Dark mode is detected from `html.dark`, which is always present on this site, so the `*Dark*` props/vars are the ones that apply.
- Off-screen (by `IntersectionObserver`), it skips painting, but its `requestAnimationFrame` loop keeps ticking.

---

## 4. Constraints

- **C-1: Stack.** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4 (CSS-first, no `tailwind.config.js`), shadcn/ui new-york. Prettier: single quotes, semicolons, `es5` commas. Exception: registry files in `components/ui/` keep their upstream double-quote style, as the existing `sparkles.tsx` and `compare.tsx` do.
- **C-2: Forced dark theme.** Don't add a light/system toggle. Light-mode props can be left at their defaults.
- **C-3: Tailwind version.** The installed version is `tailwindcss@4.0.14`. The `mask-radial-*` utilities the Aceternity demo uses (`mask-radial-to-90% mask-radial-at-center`) only arrived in Tailwind **v4.1**, so on 4.0 they silently do nothing. Use an arbitrary property: `[mask-image:radial-gradient(circle_at_center,black_55%,transparent_90%)]`. Bumping Tailwind affects the whole site and is out of scope for this change.
- **C-4: Card geometry stays fixed.** `getScrollDistance` and `handleCardClose` hard-code 224px + 16px gap. If the card width changes, update both, or better, measure the first card's `offsetWidth`.
- **C-5: Performance.**
  - Only one carousel is mounted at a time. `simple-chat-view.tsx` renders only the first tool call of the latest AI message, so the worst case is 8 canvases, one per project.
  - Each canvas runs its own `requestAnimationFrame` loop, and every dot is drawn with `shadowBlur`, which is expensive. At `gap={12}` that's about 560 dots per card, or about 4,500 blurred arcs per frame. That's why FR-4 sets `gap` to 18–20.
  - Don't set `gap` below 16px. Keep `dpr` capped at 2, as the component does.
  - Remove the dot layer while a modal is open (FR-4).
- **C-6: No upstream error text** or new network calls. All assets are local.
- **C-7: Single source of truth.** New fields live in `profile.ts`. Components only read them.
- **C-8: Vendored file is read-only.** `dotted-glow-background.tsx` is not modified in this change. ESLint keeps warning about its unused `dt` variable, which is expected. AC-10 is scoped to the files this change does modify.
- **C-9: Framer Motion owns transforms on motion elements.** Elements with a `layoutId` (the face button, the modal's category and title) get an inline `transform` from Framer Motion, which overrides Tailwind `translate-*`/`scale-*` utilities. Animate those elements through Framer props (`whileHover`, `animate`). CSS transforms are fine on plain child elements, such as the arrow.

---

## 5. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| E-1 | Long title ("YouTube Transcript RAG Chatbot", "Book Recommendation System", "Stationery system — Indian Oil") | At `text-xl`, balanced wrap, at most 3 lines, ellipsis after that. No word overflows the 176px content box (`break-words` as a safety net). It never overlaps the footer. Check "Recommendation" in the browser. |
| E-2 | Long category | One line, truncated with an ellipsis. |
| E-3 | `tagline` missing | Falls back to the first 3 `techStack` items. If those are empty, only the arrow shows. |
| E-4 | `hue` out of range | Wraps with `((h % 360) + 360) % 360`. A missing `hue` is a type error, because the field is required. |
| E-5 | Project with `links: []` | The face is unaffected. The modal already hides the Links block. |
| E-6 | Fewer cards than fit in the viewport | The next button is disabled at load (`canScrollRight` is false), and no empty scroll area shows. |
| E-7 | Mobile (375px wide) | Cards keep 224×320, the carousel scrolls horizontally, the text stays legible, and the page doesn't scroll horizontally. |
| E-8 | `prefers-reduced-motion` (`useReducedMotion()` returns true) | Dots are static (`speedScale=0`), there is no hover lift, and the entrance animation still runs once (it's short). |
| E-9 | Assistant calls `getProjects` again later in the chat | The new AI message replaces the previous view, so only one carousel is ever mounted (`simple-chat-view.tsx`). The old carousel unmounts and its canvas loops are cancelled. |
| E-10 | Duplicate project titles | `layoutId`s would collide. Titles are treated as unique, so add a dev-time `console.warn` in `Data.tsx` if they aren't. |
| E-11 | Resize or DPR change while mounted | The canvas re-measures through `ResizeObserver` and the dots regenerate with no stretching. |
| E-12 | SSR / hydration | `DottedGlowBackground` is a client component. Randomness runs only in `useEffect`, so there is no hydration mismatch. |
| E-13 | Modal open, then Esc or a click outside | Only the open card closes. Its face animates back, body scroll is restored, focus returns to the face, and the carousel scrolls to that card. The dot layers come back. |
| E-14 | Keyboard only | Tab reaches each card and both nav buttons in order, each with a visible focus ring, including the first card. Enter or Space opens a card and moves focus to the close button. Esc closes it and focus returns to the card. |
| E-15 | Canvas parses colours | `hsl(… / a)` works as a canvas `fillStyle`. Don't use `oklch` vars for the dots, because some older browsers' canvas rejects them and falls back to black. |
| E-16 | Esc pressed with no card open (e.g. in the chat input) | Nothing happens. The carousel does not scroll and body overflow is untouched. |

---

## 6. Acceptance criteria

- [ ] **AC-1:** Run `pnpm dev`, ask "show me your projects", and check that every card shows its category, title and tagline exactly once, with no clipped or overlapping text. Compare against the bug screenshot.
- [ ] **AC-2:** No text from `public/covers/*.svg` is visible on any card face, and `BlurImage` is gone from the codebase. The covers still appear, uncropped, at the bottom of the open modal.
- [ ] **AC-3:** Each card's gradient hue matches its cover SVG, as listed in the §3.1 table.
- [ ] **AC-4:** Dots shimmer and glow in the card's hue and fade out toward the edges. Confirm the mask works on Tailwind 4.0 (C-3).
- [ ] **AC-5:** Clicking a card animates the category and title into the modal header (no jump), and closing animates them back.
- [ ] **AC-6:** The nav buttons are dark-themed, have `aria-label`s, and look disabled at each end of the scroll.
- [ ] **AC-7:** Hovering a card lifts it slightly. With reduced motion turned on in the OS or DevTools, the dots are static and there is no hover lift.
- [ ] **AC-8:** At a 375px viewport, nothing overflows the card and the page doesn't scroll horizontally.
- [ ] **AC-9:** Keyboard only: every card and button is reachable, the focus ring is visible and isn't clipped on the first card, Enter opens a card with focus on the close button, and Esc closes it with focus back on the card. The modal has `role="dialog"`, `aria-modal` and an accessible name.
- [ ] **AC-10:** `pnpm build` succeeds, and `pnpm lint` reports no new errors in `src/components/projects/*` or `profile.ts`.
- [ ] **AC-11:** The change touches only the files in Scope. There are no changes in `src/app/api/**`, `tool-renderer.tsx`, `dotted-glow-background.tsx`, `src/app/page.tsx`, `.gitignore` or `pnpm-workspace.yaml`, and all card text comes from `profile.ts`.
- [ ] **AC-12:** With the Performance panel open and the carousel on screen, the frame rate stays smooth (no long tasks over 50ms from the canvas loops). Scrolled off-screen, the canvases stop painting. While a modal is open, no dot canvases are mounted.
- [ ] **AC-13:** With no card open, press Esc in the chat input. The carousel doesn't scroll, and no card's close handler runs.

---

## Appendix: installed component

Added from `https://ui.aceternity.com/registry/dotted-glow-background-demo.json`. It has no npm dependencies; its one registry dependency is `dotted-glow-background`.

- `src/components/ui/dotted-glow-background.tsx`: the reusable component this spec consumes. It is not modified.
- `src/components/dotted-glow-background-demo.tsx`: the upstream demo. It isn't imported anywhere, and it uses the v4.1-only `mask-radial-*` classes (C-3) and a remote Cal.com logo. **Delete it as part of this change.** It's untracked, so it never needs to be committed.
