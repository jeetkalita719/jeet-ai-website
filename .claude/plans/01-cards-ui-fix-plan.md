# Plan 01 — Project carousel cards: fix overlapping text, refresh the card face

Spec: `.claude/specs/cards-ui-fix.md` (rev. 2). Repo copy of this plan: `.claude/plans/01-cards-ui-fix-plan.md`.
Revised 2026-10-21 after review of the first render (see "Design changes from review" below).

## Context

`getProjects` renders `AllProjects` → `Carousel` of `Card`s (`src/components/projects/apple-cards-carousel.tsx`). Each face shows a 16:9 cover SVG (with its own baked-in `<text>` title) under `object-cover` in a 224×320 portrait box, so the SVG title is cropped, and an HTML title overlay was drawn on top of it → doubled, clipped, colliding text. The uncommitted working-tree diff in the carousel removed the HTML overlay, which leaves only the cropped SVG text and breaks the `layoutId` animation.

Investigation also confirmed these bugs in the same file:
- `layoutId` mismatch at HEAD: face `category-${category}` vs modal `category-${title}`.
- `Card` `useEffect` (`apple-cards-carousel.tsx:188-203`) adds a window `keydown` listener on **every** card regardless of `open`, and writes `body.style.overflow = 'auto'` on mount. Esc anywhere → all 8 cards call `onCardClose(i)` → carousel jumps to the last card.
- Nav buttons are light-theme (`bg-gray-100`, `text-gray-500`).
- No a11y: no focus ring, no dialog semantics, unlabeled close button.

Intended outcome: a face with the text rendered once in HTML: category at the top, a **bold title centred in the middle**, and tagline + arrow at the bottom. Every card has the **same dark background as the Aceternity Dotted Glow inspiration card** (the site's dark background with a faint ring/shadow, neutral-grey dots and a sky-blue glow) instead of per-project colours. The open/close shared-element transition should work, and the modal should be keyboard-accessible.

### Design changes from review (override the spec)
Jeet reviewed the first render (per-project hue gradients, title top-left) and asked for:
1. **Title in the middle, centred horizontally and vertically, in a bolder weight.**
2. **One background for every card, matching the Aceternity inspiration card.**

Consequences against the spec:
- **FR-2:** the title moves from below the category to a vertically centred, `text-center`, `font-bold` block that fills the middle of the card. The category stays top-left, and the footer stays at the bottom.
- **FR-3:** replaced. There's no per-project gradient and no top scrim. The card uses `bg-background`, the site's dark background (`oklch(0.141 0.005 285.823)` in `globals.css`), which is what the transparent inspiration card shows through to.
- **FR-4:** the dot colours are fixed: dots at the inspiration's `neutral-500`, glow at `sky-800`. They're passed as literal `rgb()` props, not `--color-*` vars, because Tailwind v4's palette vars are `oklch` (E-15).
- **§3.1 `hue`, E-4, AC-3:** dropped. `Project` gets no `hue` field, and `CarouselCard` has no `hue`. The tagline isn't hue-tinted; it uses the inspiration's `neutral-400`.
- Everything else in the spec stands (FR-1, FR-5–FR-10, a11y, performance, scope).

**Facts verified in the repo**
- `tailwindcss@4.0.14` (no `mask-radial-*`; use an arbitrary `mask-image`), `framer-motion@12.5.0` (has `useReducedMotion`). Imports use `'framer-motion'`, not `'motion'`.
- The inspiration (`src/components/dotted-glow-background-demo.tsx`, dark mode): transparent card, `shadow shadow-white/10 ring-1 ring-white/5`, dots `--color-neutral-500`, glow `--color-sky-800`, `opacity={1}`, `radius={1.6}`, `gap={10}`, mask `mask-radial-to-90% mask-radial-at-center`, footer text `neutral-400` on `backdrop-blur-[2px]`.
- `prompt.ts` only reads `title/category/date/description/techStack/links`, so the new `tagline` field doesn't leak into the prompt.
- `BlurImage` is used only inside the carousel file.
- `useOutsideClick` (`src/hooks/use-outside-click.tsx`) already no-ops while closed (`!ref.current` is true because the modal isn't mounted). It's out of scope, so leave it unchanged.
- Baseline `eslint` on the carousel: 2 errors (unused `currentIndex` at :186, `@ts-ignore` at :205) and 1 warning (exhaustive-deps). The rewrite removes all three. `use-outside-click.tsx` has 2 pre-existing errors; it's out of scope, so leave them.

---

## Step 0: Save this plan into the repo
Done: this file is the saved plan.

## Step 1: Data (`src/lib/profile.ts`)
- Extend `Project` with `tagline?: string;` (one line for the card footer, ≤ 60 chars recommended). Update the `cover` comment to `// path under /public, 16:9; used in the modal only`. **No `hue` field.**
- Add a `tagline` to all 8 entries, verbatim from the spec's §3.1 table (ignore the hue column).
- Don't touch any other field.

## Step 2: Card data mapping (`src/components/projects/Data.tsx`)
- `import type { CarouselCard } from './apple-cards-carousel';`
- Add a local helper, not exported: `resolveTagline = (p: Project) => p.tagline ?? p.techStack.slice(0, 3).join(' · ')` (an empty string means "hide it").
- `export const data: CarouselCard[] = PROJECTS.map((p) => ({ title, category, tagline: resolveTagline(p), src: p.cover, content: <ProjectContent project={p} /> }))`.
- E-10: a module-level dev-only duplicate-title check: `if (process.env.NODE_ENV !== 'production')`, go through a `Set` and `console.warn` on any duplicate title.
- Leave `ProjectContent` unchanged (the cover stays at the bottom at `aspect-video`, uncropped).

## Step 3: Carousel + Card (`src/components/projects/apple-cards-carousel.tsx`)

### 3a. Types, imports, context
- Replace the local `type Card` with:
  ```ts
  export type CarouselCard = {
    title: string;
    category: string;
    tagline: string;          // already resolved with the fallback; may be ''
    src: string;              // cover, for the modal
    content: React.ReactNode;
  };
  ```
- Imports: drop `next/image` / `ImageProps`. Add `useCallback`, `useId`, `useMemo` from React, `useReducedMotion` from `framer-motion`, and `DottedGlowBackground` from `@/components/ui/dotted-glow-background`.
- `CarouselContext` gains `openIndex: number | null` and `onCardOpen(index)`. Defaults: `openIndex: null`, `onCardOpen: () => {}`.

### 3b. `Carousel`
- `const [openIndex, setOpenIndex] = useState<number | null>(null)`.
- Make the handlers stable so `Card`'s effects don't re-run on every carousel render (that would re-focus the close button and re-lock scroll):
  - `onCardOpen = useCallback((i) => setOpenIndex(i), [])`
  - `handleCardClose = useCallback((i) => { setOpenIndex(null); …existing scrollTo…; setCurrentIndex(i); }, [])`. Inline the 16px gap and drop the pointless `isMobile()` ternary/helper.
  - Wrap the context value in `useMemo`.
- Keep the card geometry (224px + 16px) as is (C-4: the card size doesn't change).
- Nav buttons (FR-7): `type="button"`, `aria-label="Previous projects"` / `"Next projects"`. Classes: `bg-neutral-800 ring-1 ring-white/10 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors`. Icon: `text-neutral-200`.
- Leave the entrance-stagger wrapper unchanged (E-8: it still runs under reduced motion).

### 3c. `Card`: state, effects, a11y
- `const { onCardOpen, onCardClose, openIndex } = useContext(CarouselContext)` (no `currentIndex`, which removes the lint error).
- Refs: `faceRef` (`HTMLButtonElement`), `closeRef` (`HTMLButtonElement`), `containerRef` (as today). `const titleId = useId();` `const reduceMotion = useReducedMotion();`
- `handleOpen = () => { setOpen(true); onCardOpen(index); }`
- `handleClose = useCallback(() => { setOpen(false); onCardClose(index); }, [onCardClose, index])`
- Replace the old effect (FR-10, FR-8):
  ```ts
  useEffect(() => {
    if (!open) return;
    const face = faceRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      face?.focus({ preventScroll: true });
    };
  }, [open, handleClose]);
  ```
  No listener and no body write while closed (E-16 / AC-13). The cleanup also covers unmount-while-open (E-9): scroll is restored, and focusing a detached node is a no-op.
- `useOutsideClick(containerRef as React.RefObject<HTMLDivElement>, handleClose)`: the cast replaces `//@ts-ignore` (React 19's `useRef(null)` type vs the hook's pre-19 signature), and passing the stable `handleClose` replaces the inline arrow.

### 3d. Modal (keep the structure; it stays a **sibling** of the face, never a child, so the face's hover transform can't break `position: fixed`)
- Container `motion.div` (with `ref={containerRef}`, `layoutId card-${title}`): add `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`.
- Close button: `ref={closeRef}`, `type="button"`, `aria-label="Close"`, plus a visible `focus-visible:ring-2 focus-visible:ring-white/60` style.
- Title `motion.p`: add `id={titleId}`. Keep `layoutId`s `category-${title}` and `title-${title}`, which already match the new face. The modal title stays left-aligned; the shared-layout animation moves it from the card's centre into the header.
- Content (`card.content`) is unchanged.

### 3e. Face (FR-1, revised FR-2–FR-4, FR-5, FR-8)
Remove `<BlurImage>` and the whole `BlurImage` export. New face, laid out as a three-row flex column (category / centred title / footer):

```tsx
<motion.button
  ref={faceRef}
  type="button"
  layoutId={layout ? `card-${card.title}` : undefined}
  onClick={handleOpen}
  whileHover={reduceMotion ? undefined : { y: -4 }}
  aria-label={`Open ${card.title}`}
  className="group relative z-10 flex h-80 w-56 flex-col overflow-hidden rounded-3xl bg-background
             p-6 text-left shadow shadow-white/10 ring-1 ring-white/5 transition-shadow
             hover:ring-white/15 focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-inset focus-visible:ring-white/60"
>
  {openIndex === null && (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <DottedGlowBackground
        className="[mask-image:radial-gradient(ellipse_at_center,black,transparent_90%)]"
        gap={16} radius={1.6} opacity={1} backgroundOpacity={0}
        speedMin={0.3} speedMax={1.6} speedScale={reduceMotion ? 0 : 1}
        darkColor="rgb(115 115 115)"   /* neutral-500 */
        darkGlowColor="rgb(7 89 133)"  /* sky-800 */
      />
    </div>
  )}

  {/* Row 1: category, top-left */}
  <motion.p layoutId={layout ? `category-${card.title}` : undefined}
    className="relative z-10 w-full truncate text-sm font-medium text-neutral-400">{card.category}</motion.p>

  {/* Row 2: title, centred both ways in the remaining space */}
  <div className="relative z-10 flex w-full flex-1 items-center justify-center">
    <motion.p layoutId={layout ? `title-${card.title}` : undefined}
      className="line-clamp-3 w-full text-center text-xl font-bold break-words text-white [text-wrap:balance]">
      {card.title}
    </motion.p>
  </div>

  {/* Row 3: footer */}
  <div className="relative z-10 flex w-full items-end justify-between gap-3 backdrop-blur-[2px]">
    {card.tagline && (
      <p className="line-clamp-2 text-xs text-neutral-400">{card.tagline}</p>
    )}
    <IconArrowNarrowRight aria-hidden className="ml-auto h-5 w-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1" />
  </div>
</motion.button>
```

Implementation notes:
- **Background:** `bg-background` is the same colour the inspiration card shows through to on this site. Using the token instead of `bg-transparent` gives the shared-layout morph into the modal a solid fill to animate from, and keeps every card identical whatever is behind the carousel. There is no gradient and no scrim.
- **Dots:** the inspiration uses `--color-neutral-500` / `--color-sky-800`, but in Tailwind v4 those vars are `oklch(...)`, which some canvases reject (E-15). So pass the equivalent sRGB literals through `darkColor` / `darkGlowColor`: no CSS variables on the card and no `colorDarkVar` props. `gap={16}` is the floor allowed by C-5 (the inspiration's 10 would be about 2.5× the blurred arcs), and `radius={1.6}`/`opacity={1}` match the inspiration.
- **Mask:** this is the Tailwind 4.0 equivalent of `mask-radial-to-90% mask-radial-at-center` (an ellipse from black at the centre to transparent at 90%).
- **Centred title legibility:** the dots are densest behind the centred title. `font-bold` white on dim grey dots should read fine. If it doesn't in the browser, add `[text-shadow:0_1px_8px_rgb(0_0_0/0.8)]` to the title. Don't add a scrim back.
- **Title size:** keep `text-xl` (C-1/FR-2's 176px width limit). "Recommendation" in bold at 20px is about 165px, so it still fits. Keep `break-words` as a safety net (E-1). If `[text-wrap:balance]` plus `line-clamp-3` misbehaves on the long titles, keep the clamp and drop the balance.
- The hover lift uses Framer (`whileHover`), not Tailwind (C-9). The arrow is a plain element, so a CSS `translate` is fine there. The carousel's `py-10` leaves room, so the 4px lift isn't clipped.
- `ring-inset` on focus keeps the first card's ring from being clipped by the scroll container (FR-8).

## Step 4: Clean up
- Delete `src/components/dotted-glow-background-demo.tsx` (untracked, not imported, uses v4.1 classes and a remote logo). Its styling values are recorded above.
- Leave `AllProjects.tsx` unchanged. It already passes `card` / `index` / `layout`, and the types flow from `data: CarouselCard[]`.
- Leave `public/covers/*.svg` unchanged; they're still used in the modal.
- Don't touch `src/app/page.tsx`, `.gitignore`, `pnpm-workspace.yaml`, `src/app/api/**`, `tool-renderer.tsx`, `dotted-glow-background.tsx` or `use-outside-click.tsx`.

## Step 5: Commit (only when asked)
Stage explicitly, with no `git add -A`:
`src/lib/profile.ts`, `src/components/projects/Data.tsx`, `src/components/projects/apple-cards-carousel.tsx`, and `src/components/ui/dotted-glow-background.tsx`. That last file is currently untracked and now imported, so a clean checkout won't build without it. Optionally also stage `.claude/specs/cards-ui-fix.md` and `.claude/plans/01-cards-ui-fix-plan.md`.

---

## Files touched
| File | Change |
|---|---|
| `src/lib/profile.ts` | `Project` gains `tagline?`, with values for all 8 projects |
| `src/components/projects/Data.tsx` | typed `CarouselCard[]`, tagline fallback, duplicate-title warning |
| `src/components/projects/apple-cards-carousel.tsx` | new face (uniform inspiration background, centred bold title), context `openIndex`/`onCardOpen`, scoped Esc/scroll-lock effect, focus management, dialog a11y, dark nav buttons, `BlurImage` removed |
| `src/components/dotted-glow-background-demo.tsx` | deleted |
| `src/components/ui/dotted-glow-background.tsx` | consumed only (must be committed, not edited) |

## Verification
1. **Static checks:** `npx eslint src/components/projects src/lib/profile.ts` should show 0 errors (baseline was 2), then `pnpm build` should succeed (AC-10). `grep -r BlurImage src` and `grep -rn "hue" src/components/projects src/lib/profile.ts` should both return nothing.
2. **`pnpm dev`**, then ask "show me your projects" in the browser (Claude in Chrome):
   - AC-1/AC-2: each card shows category (top-left), title and tagline once, with no SVG text. Screenshot it and compare with the review screenshot.
   - **Revised layout:** every title is bold and centred horizontally and vertically in the card, and long titles ("YouTube Transcript RAG Chatbot", "Book Recommendation System", "Stationery system — Indian Oil") wrap to at most 3 balanced lines with no overflow.
   - **Revised background (replaces AC-3):** all 8 cards share the same dark background, ring and shadow as the inspiration, with no per-project tint. Grey dots glow sky-blue and fade toward the edges (AC-4, which confirms the mask works on 4.0).
   - AC-5: open a card. Category and title animate into the header, then back on close. The cover shows uncropped at the bottom.
   - AC-6: nav buttons are dark, labelled, and disabled at each end.
   - AC-7: hover lifts the card and nudges the arrow. Emulate `prefers-reduced-motion: reduce` in DevTools and check the dots are static and there's no lift.
   - AC-8: at 375px wide, no horizontal page scroll.
   - AC-9 / E-14: Tab through cards and buttons. Each has a ring, and the first card's isn't clipped. Enter opens a card with focus on Close. Esc closes it with focus back on the card. Check `role="dialog"` and the name via `read_page`.
   - AC-12: open a modal and check `document.querySelectorAll('canvas').length === 0`. After closing, there are 8 again. Do a Performance recording with the carousel on screen and look for long tasks over 50ms.
   - AC-13 / E-16: with no card open, focus the chat input and press Esc. The carousel's `scrollLeft` doesn't change and `document.body.style.overflow` stays untouched.
   - E-13: open a card, then close it by clicking the backdrop. Only that card closes, scroll is restored, and the carousel scrolls to it.
3. **AC-11:** `git status` / `git diff --stat` only shows the files in the table above, plus the pre-existing unrelated changes, which stay unstaged.
