# Spec: Fluid pointer glow — keep it behind the chat, faded under cards and reply text

Status: Draft (rev. 1) · Owner: Jeet Kalita · Date: 2026-10-27
Scope: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/FluidCursor.tsx`, `src/hooks/use-FluidCursor.tsx` (lifecycle only), `src/components/chat/{chat,simple-chat-view,tool-renderer,chat-landing,chat-bottombar}.tsx`, and the card components `src/components/{skills,services,fun,resume,contact,presentation}.tsx` and `src/components/projects/AllProjects.tsx` (class changes only)

---

## 1. Problem statement

On the landing page (`/`), moving the cursor leaves a colourful fluid "glow" trail behind the content (Image 1). As soon as a chat starts (`/chat?query=…`, from the input or a quick-question chip), the effect is gone: the conversation sits on a flat black background and moving the cursor does nothing (Image 2).

**Root cause.** The effect is the `FluidCursor` component (a full-screen WebGL fluid simulation in `src/hooks/use-FluidCursor.tsx`, drawn into `<canvas id="fluid">`). It's rendered in exactly one place: the last child of the landing page, `src/app/page.tsx:125`. The `/chat` route (`src/app/chat/page.tsx` → `Chat`) never renders it. `router.push('/chat?…')` unmounts the landing page and its canvas with it.

**Why "just render it on /chat too" isn't enough.** Five things found during the investigation would break or degrade that naive fix:

1. **No teardown.** `useFluidCursor()` starts a `requestAnimationFrame` loop and adds 7 listeners on `window`/`document.body` (`use-FluidCursor.tsx:1129–1210`), and returns nothing. `FluidCursor`'s effect has no cleanup. Today, after `/` → `/chat` the simulation **keeps running** against a detached 0×0 canvas, using GPU time for nothing. Back on `/` (the Home link is a client-side `<Link>`), a second simulation and a second set of listeners start, and every round trip adds one more. Mounting it on both routes would make this happen on every navigation.
2. **The loop can start twice.** `handleFirstMouseMove` and `handleFirstTouchStart` each call `update()` directly (`:1142`, `:1168`). On a touch device the first tap fires `touchstart` and then a compatibility `mousemove`, so two loops run on the same context. A two-finger first touch starts one per finger. In dev, StrictMode runs the effect twice, which does the same thing. Each extra loop doubles both the simulation speed and its GPU cost.
3. **The canvas would block the chat.** The canvas wrapper is `fixed top-0 left-0 z-0` with no `pointer-events-none` (`FluidCursor.tsx:12`). On `/` that's harmless because every interactive element there is `z-1`/`z-10`. On `/chat` the main content is not positioned, so a `z-0` fixed canvas would paint **over** the conversation and swallow every click, scroll and text selection.
4. **No WebGL means a crashed site.** If neither WebGL2 nor WebGL is available, `getWebGLContext` dereferences a `null` context (`gl.getExtension`) and throws inside the effect. Today that only breaks `/`. Once the effect is mounted app-wide (FR-1), it would take down `/chat` too.
5. **Opaque and clipped chat chrome.**
   - The bottom bar is `bg-background` (`chat.tsx:326`). Nothing ever scrolls under it (the scroll container sits above it in the flex column), so its only effect would be a solid black strip hiding the glow.
   - Two containers clip flush with the text edges: the dead `overflow-y-auto` in `SimplifiedChatView` (`simple-chat-view.tsx:64`, which never scrolls; see spec 03) and the `overflow-hidden rounded-lg` tool wrapper (`tool-renderer.tsx:33`). Either one would cut the soft edge of the reply-text fade (FR-4) into a hard line.

**Readability problem the effect introduces.** On `/` almost no text sits on the glow. On `/chat` a lot does:
- The AI's reply text has **no surface at all**: `ChatBubbleMessage` `received` is just `text-secondary-foreground rounded-lg py-2` (`chat-bubble.tsx:88`). Image 2's "I've got a solid mix of skills…" paragraph would sit directly on bright swirls.
- Several cards have text outside their surface: the "Me" card's name, title and bio column (`presentation.tsx:58`), the Services heading and intro (`services.tsx:18–19`), the "My Projects" heading (`AllProjects.tsx:13`) and the `/chat` empty-state heading (`chat-landing.tsx:66–71`).
- Every card surface is currently opaque (`bg-card`, `bg-accent`), so the glow would be fully hidden behind cards. That's readable, but it isn't the "faded" look that's wanted.

**Goal.** Make the fluid glow a site-wide background that keeps working when a chat is started, with one simulation for the app's lifetime. Readability of everything on top of it must be protected:
- Card surfaces let the glow through only as a faint tint.
- Text that has no surface gets a soft, borderless dark backdrop that dims the glow behind it.

Decisions taken with Jeet for this spec:
- **Cards: faint tint.** The outermost surface of each card becomes ~90% opaque, with no blur. The glow shows through as a faint colour wash. No `backdrop-filter`, because it would be recomputed every frame over an animating canvas.
- **Reply text: invisible scrim.** The glow is dimmed behind the reply by a soft, feathered dark backdrop that doesn't read as a box. The reply looks the same as today; it just sits in a calm patch.
- **Strength: same as home.** The simulation's config, colours and intensity are identical on both routes. Readability is handled only by the card tint and the scrim.

---

## 2. Functional requirements

### FR-1: One simulation, mounted once for the whole app
- Remove `<FluidCursor />` from `src/app/page.tsx` and render it once in `src/app/layout.tsx`, inside `ThemeProvider`, as the sibling **after** `<main>`. The root layout never remounts on client-side navigation, so the same simulation, canvas and listeners serve `/` and `/chat`.
- The fluid continues across a navigation: swirls drawn on `/` are still fading when `/chat` appears. There is no reset or flash.
- Any future route gets the effect automatically.

### FR-2: The canvas is a passive background layer
- The `FluidCursor` wrapper gets `pointer-events-none` and `aria-hidden="true"`. It stays `fixed top-0 left-0 z-0`, and the canvas keeps `h-screen w-screen`.
- Pointer input is unaffected: the simulation listens on `window`, not on the canvas, so the glow follows the cursor over cards, text, gutters and the bottom bar alike.
- The `/chat` root (`chat.tsx:216`, `relative h-screen overflow-hidden`) gets `z-10`, so the whole chat UI stacks above the canvas. The landing page's layering is unchanged (its content is already `z-1`/`z-10`).

### FR-3: Lifecycle: teardown and single start (`use-FluidCursor.tsx`)
- `useFluidCursor()` returns a dispose function, and `FluidCursor`'s effect returns it as its cleanup. Dispose:
  - cancels the pending animation frame and sets a `disposed` flag, so an in-flight `update()` doesn't schedule another;
  - removes all 7 listeners. That means converting the anonymous handlers to named functions so they can be removed.
- Dispose does **not** call `WEBGL_lose_context`. Under StrictMode, React re-runs the effect on the same `<canvas>` element, and `getContext` would hand back the lost context. Leaking one set of GL objects in dev is acceptable. In production the layout never unmounts, so dispose never runs.
- Starting the loop goes through one guarded `start()` (`if (started) return; started = true; update();`). Both "first input" handlers call `start()` instead of `update()`. Exactly one loop runs, whatever the input device or number of touches.
- No changes to `config`, shaders, colours, splat logic or resolution handling. The effect must look and feel exactly as it does on `/` today.

### FR-4: Init failure degrades to a plain background
- `FluidCursor` wraps the init call in `try/catch`. On failure (no WebGL, context creation refused), it logs one `console.warn` and renders nothing further. The site works on the plain `bg-background`, exactly as `/chat` looks today.

### FR-5: Card surfaces: faint tint
- The **outermost** visible surface of every chat card goes from opaque to **90%**. For example, `bg-card` becomes `bg-card/90` and `bg-accent` becomes `bg-accent/90`. The full list is in §3.4.
- Nested surfaces inside a card (Contact tiles, the notes wall, the draft-email panel, Services' icon chips, badges, tags) are **unchanged**. They already sit on a 90% parent, so the glow under them is ~1% or less, which is invisible.
- No surface that carries text drops below **80%** in any state (rest, hover, disabled). The one existing hover that would break this is `hover:bg-accent/70` on the empty-state suggestions; it becomes `/80`.
- No `backdrop-filter`/`backdrop-blur` is added anywhere (C-3).

### FR-6: Off-surface text: invisible scrim
- A new `.glow-scrim` class (§3.3) draws a soft, borderless dark backdrop behind its host. It's 85% `--background` in the middle and feathers to transparent over 16px **outside** the host's box on every side. It has no border, no shadow and no blur, and it ignores pointer events.
- It's applied to every block of text that sits directly on the background on `/chat` (full list in §3.5):
  - the AI reply text;
  - the "Me" card's text column;
  - the Services heading and intro;
  - the "My Projects" heading;
  - the `/chat` empty-state heading and subtitle.
- The scrim is sized by its host, so a reply that's still streaming grows its scrim with no JS.
- The pending user bubble (opaque `#007AFF`) and the loading dots bubble don't get a scrim.

### FR-7: Give the scrim's feather room (remove two dead or flush clips)
- `simple-chat-view.tsx:64`: remove `overflow-y-auto` from the inner `div`. It never scrolls (`h-full` resolves to `auto`; spec 03 AC-9 confirms this). It does, however, clip horizontally flush with the reply's edges.
- `tool-renderer.tsx:33`: the wrapper's `overflow-hidden rounded-lg` becomes just `w-full`. Every card has its own radius (`rounded-xl` or larger), and the carousel clips inside its own `overflow-x-scroll`, so the wrapper's clip does nothing useful. Removing it also fixes the clipped hover-scale on the first Skills badge, the same issue spec 04 E-5 describes.
- After this, the nearest horizontal clip for any scrim host is the chat scroll container's padding box (`chat.tsx:285`). That leaves 24px of room (`px-4` in `SimplifiedChatView` + `px-2` on the scroll container), which fits the 16px feather with room to spare.

### FR-8: Bottom bar lets the glow through
- `chat.tsx:326`: remove `bg-background` from the bottom bar. The glow then shows around the input pill and the HelperBoost chips.
- The input pill (`chat-bottombar.tsx:58`, `bg-accent`) becomes `bg-accent/90`, per FR-5.
- HelperBoost chips (`dark:bg-neutral-900`) stay opaque. They're small buttons, not cards.

### Non-goals
- No change to the simulation's look: no change to `config`, colours, intensity, `DYE_RESOLUTION` or shading. No per-route dimming.
- No change to the fixed avatar header band on `/chat` (gradient, height, `pointer-events-none`). It keeps hiding the glow in the top ~100–180px, by design (spec 03).
- No change to the project carousel **card faces**. They're opaque per-project gradients with their own animated dot texture (spec `cards-ui-fix.md` FR-3/FR-4). Tinting them would shift each card's hue away from its cover.
- No change to the project modal (`bg-black/80 backdrop-blur-lg` overlay, `bg-neutral-900` panel) or the HelperBoost drawer.
- No change to shadcn primitives (`ui/card.tsx`, `ui/chat/chat-bubble.tsx`). Override at the call site.
- No `prefers-reduced-motion` handling for the simulation. `/` doesn't have it today; it's a separate change.
- No idle pause (stopping the loop when the fluid has fully faded). That's a possible follow-up if C-8 measurements call for it.
- No light-theme work (the site is forced dark).

---

## 3. API contracts (inputs, outputs, data shapes)

No HTTP, LLM tool, `prompt.ts` or `profile.ts` contract changes. The contracts below are the hook, the component, one CSS class and the class lists.

### 3.1 `useFluidCursor` (`src/hooks/use-FluidCursor.tsx`)

```ts
// before
const useFluidCursor = () => { /* … */ };            // returns undefined

// after
const useFluidCursor = (): (() => void) => {
  // … unchanged setup …
  let rafId = 0;
  let started = false;
  let disposed = false;

  function update() {
    if (disposed) return;
    // … unchanged body …
    rafId = requestAnimationFrame(update);
  }
  function start() {
    if (started) return;
    started = true;
    update();
  }
  // handlers become named functions; the two "first input" handlers call start()

  return () => {
    disposed = true;
    cancelAnimationFrame(rafId);
    // removeEventListener for each of the 7 handlers, same target and options as added
  };
};
```

- **Input:** none. It still finds the canvas with `document.getElementById('fluid')`, which is safe because exactly one is ever mounted (FR-1).
- **Output:** an idempotent dispose function.
- **Throws:** when no WebGL context can be created (caught by `FluidCursor`, FR-4).
- The file stays `// @ts-nocheck`. The name stays `useFluidCursor` (it isn't a React hook, but renaming it is churn outside this change).

### 3.2 `FluidCursor` (`src/components/FluidCursor.tsx`)

```tsx
const FluidCursor = () => {
  useEffect(() => {
    try {
      return fluidCursor();
    } catch (err) {
      console.warn('FluidCursor: WebGL unavailable, background effect disabled', err);
    }
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-0">
      <canvas id="fluid" className="h-screen w-screen" />
    </div>
  );
};
```

Mounted in `src/app/layout.tsx`:

```tsx
<ThemeProvider …>
  <main className="flex min-h-screen flex-col">{children}</main>
  <FluidCursor />
  <Toaster />
</ThemeProvider>
```

### 3.3 `.glow-scrim` (`src/app/globals.css`)

```css
@layer components {
  .glow-scrim {
    --scrim-bleed: 16px;
    --scrim-strength: 85%;
    position: relative;
    isolation: isolate;
  }
  .glow-scrim::before {
    content: '';
    position: absolute;
    inset: calc(var(--scrim-bleed) * -1);
    z-index: -1;
    pointer-events: none;
    border-radius: 1.5rem;
    background: color-mix(in oklab, var(--background) var(--scrim-strength), transparent);
    --scrim-x: linear-gradient(to right, transparent, #000 var(--scrim-bleed), #000 calc(100% - var(--scrim-bleed)), transparent);
    --scrim-y: linear-gradient(to bottom, transparent, #000 var(--scrim-bleed), #000 calc(100% - var(--scrim-bleed)), transparent);
    -webkit-mask-image: var(--scrim-x), var(--scrim-y);
    -webkit-mask-composite: source-in;
    mask-image: var(--scrim-x), var(--scrim-y);
    mask-composite: intersect;
  }
}
```

- **Host requirements:** at least `--scrim-bleed` (16px) of unclipped space on every side. That's guaranteed in the chat column after FR-7.
- `isolation: isolate` keeps the `z-index: -1` pseudo-element above the canvas and behind the host's own text, whatever the ancestors' stacking.
- Plain CSS in `@layer components`, not `@utility`, so it doesn't depend on Tailwind 4.0's handling of nested pseudo-elements inside `@utility`.

### 3.4 Card surface tint (FR-5, FR-8)

| File:line | Element | Before | After |
|---|---|---|---|
| `skills.tsx:56` | `Card` (default `bg-card` from primitive) | `w-full border-none pb-12 shadow-none` | `bg-card/90 w-full border-none pb-12 shadow-none` |
| `services.tsx:27` | each service tile | `bg-accent …` | `bg-accent/90 …` |
| `fun.tsx:11` | card | `bg-accent …` | `bg-accent/90 …` |
| `resume.tsx:15` | card link | `… bg-accent …` | `… bg-accent/90 …` |
| `contact.tsx:64` | outer card | `bg-accent …` | `bg-accent/90 …` |
| `chat-landing.tsx:78` | suggestion buttons | `bg-accent hover:bg-accent/70 …` | `bg-accent/90 hover:bg-accent/80 …` |
| `chat-bottombar.tsx:58` | input pill | `bg-accent …` | `bg-accent/90 …` |
| `tool-renderer.tsx:39` | unknown-tool fallback | `bg-secondary/10 …` | `bg-card/90 …` |
| `chat.tsx:326` | bottom bar | `bg-background sticky …` | `sticky …` |

`presentation.tsx:28` (the photo frame) is left alone because the photo covers it. `tailwind-merge` in `Card` resolves `bg-card/90` over the primitive's `bg-card`. Run Prettier for class order.

### 3.5 Scrim hosts (FR-6)

| File:line | Host | Change |
|---|---|---|
| `simple-chat-view.tsx:77` | reply wrapper `div.w-full` | add `glow-scrim` |
| `presentation.tsx:58` | text column `div.flex.flex-col` | add `glow-scrim` |
| `services.tsx:18–19` | `h2` + `p` | wrap both in `<div className="glow-scrim mb-6">`, and move `mb-6` off the `p` |
| `AllProjects.tsx:13` | "My Projects" `h2` | add `glow-scrim w-fit`, and drop the no-op `mx-auto max-w-7xl` (keeps it left-aligned) |
| `chat-landing.tsx:66–71` | `motion.h2` + `motion.p` | wrap both in `<div className="glow-scrim flex w-fit max-w-full flex-col items-center">`. Framer variants still propagate through a plain `div`. |

### 3.6 Layering and clip changes (FR-2, FR-7)

| File:line | Before | After |
|---|---|---|
| `chat.tsx:216` | `relative h-screen overflow-hidden` | `relative z-10 h-screen overflow-hidden` |
| `simple-chat-view.tsx:64` | `custom-scrollbar flex h-full w-full flex-col overflow-y-auto` | `flex h-full w-full flex-col` |
| `tool-renderer.tsx:33` | `w-full overflow-hidden rounded-lg` | `w-full` |
| `page.tsx:4, :125` | imports and renders `<FluidCursor />` | both removed |

---

## 4. Constraints

- **C-1: Stack.** Next.js 15 App Router, React 19, TypeScript strict, Tailwind `4.0.14` (CSS-first, no `tailwind.config.js`), shadcn/ui new-york, `framer-motion@^12`. Prettier: single quotes, semicolons, `es5` commas, `prettier-plugin-tailwindcss`. No new dependencies.
- **C-2: Forced dark theme.** Don't add a light/system toggle. `--background` in `.dark` is the scrim colour.
- **C-3: No per-frame filters over the canvas.** The WebGL canvas redraws every frame, so any `backdrop-filter` or `filter: blur` above it would be re-rasterised every frame. The tint is plain alpha. The scrim is a static `mask-image` on its own pseudo-element: the mask applies to the scrim's own pixels, not to the backdrop, so the compositor just alpha-blends it.
- **C-4: Vendored simulation stays vendored.** Changes in `use-FluidCursor.tsx` are limited to FR-3 (named handlers, `rafId`/`started`/`disposed`, the returned dispose). No algorithm, shader or config edits, and no reformatting of untouched code.
- **C-5: Stacking.** The canvas is `z-0` in the root stacking context, after `<main>`. `/` content is `z-1`/`z-10`, and the `/chat` root is `z-10` (FR-2). Portalled UI (Toaster, vaul Drawer at `z-100`, the project modal's fixed overlay) stays above the chat as today.
- **C-6: Don't edit shared primitives** (`Card`, `ChatBubble*`). `cn()`/`tailwind-merge` lets a call-site `bg-card/90` override the default.
- **C-7: Opacity modifiers on theme colours.** `bg-card/90` and `bg-accent/90` compile to `color-mix(in oklab, var(--color-*) 90%, transparent)` on Tailwind 4.0, the same mechanism the existing `bg-card/60` and `bg-accent/70` already use. Unprefixed `mask-composite` needs Safari 15.4+, and the `-webkit-` pair in §3.3 covers older WebKit.
- **C-8: Performance.**
  - Exactly one simulation and one rAF loop for the app's lifetime (FR-1, FR-3). This is lighter than today, where every `/` ↔ `/chat` round trip adds a leaked loop.
  - `/chat` now also pays for the full-screen simulation (dye 1440, 20 pressure iterations) that `/` already pays for. With the Projects carousel open, that adds up to 8 dotted-glow canvases on top.
  - Browsers pause rAF in hidden tabs, so no extra handling is needed for that.
- **C-9: Hydration.** The canvas markup is static. All WebGL and randomness run in `useEffect`, so there's no server/client mismatch.
- **C-10: Spec 03 interplay.** The header keeps `pointer-events-none` with its `pointer-events-auto` opt-ins. `z-10` on the chat root creates a stacking context, but the header's `z-50` and the Home link's `z-[51]` still order the same way inside it. `scrollRef`/`onScroll` are untouched.

---

## 5. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| E-1 | Fresh load straight into `/chat?query=…` (never visited `/`) | The canvas mounts with the layout. The simulation starts on the first pointer move or touch, just as it does on `/`. |
| E-2 | `/` → `/chat` via the input or a chip | Same simulation, no restart. Swirls in progress keep fading under the chat. |
| E-3 | `/chat` → Home link → `/chat` again, repeated | No re-init. Still exactly one rAF loop and one set of listeners (AC-9). |
| E-4 | Cursor over a card (Skills, Contact, Services, Fun, Resume) | The glow draws underneath and shows through as a faint ~10% tint. Card text stays readable. |
| E-5 | Cursor over the AI reply text | The glow under the text is dimmed to ~15% by the scrim. Its feathered edge blends into full glow with no visible box edge or line. |
| E-6 | Click anywhere (`mousedown` splat), including on buttons and cards | Splat burst as on `/`. It shows faintly under surfaces and is dimmed under text. |
| E-7 | Select or copy reply text, click links in a reply | Works. The canvas and the scrim pseudo-element are both `pointer-events: none`. |
| E-8 | Touch scroll on mobile | The finger paints fluid while it scrolls. Window-level touch listeners are passive by default, so scrolling isn't blocked or janky. |
| E-9 | First tap on a touch device (`touchstart` + compatibility `mousemove`), or a two-finger first touch | One loop starts (`start()` guard). Speed matches desktop. |
| E-10 | Dev with StrictMode (effect runs, cleans up, runs again) | The first instance's loop and listeners are disposed. One loop runs. One set of GL objects leaks once (dev only, acceptable). |
| E-11 | WebGL unavailable or context creation fails | One `console.warn`, no canvas activity. Both routes render on plain `bg-background` and nothing else breaks. |
| E-12 | Project modal open (`bg-black/80 backdrop-blur-lg` over a canvas that changes every frame) | The blur is recomputed per frame under the modal. Acceptable for this change; measure it in AC-10. If it janks, the follow-up is to drop the blur (it's barely visible through 80% black) or pause the sim while the modal is open. |
| E-13 | Top of `/chat` | The avatar header band still fades the glow out toward the top edge (unchanged, spec 03). |
| E-14 | Bottom bar | The glow is visible around the 90% input pill and the opaque HelperBoost chips, with no black strip. |
| E-15 | Reply streaming in | The scrim grows with the text block. No layout shift, and nothing outside the reply moves. |
| E-16 | Answer with a card and no text | No reply scrim, only the card's tint. |
| E-17 | Unknown tool name (fallback block) | Rendered on a `bg-card/90` surface, readable over the glow. |
| E-18 | Mobile 375px | The scrim's 16px bleed fits inside the 24px gutter. There's no horizontal page scroll, and the scrim isn't cut into a hard edge. |
| E-19 | Window resize or rotation | `resizeCanvas()` already re-measures every frame. Unchanged. |
| E-20 | Hidden tab | The browser pauses rAF, so the simulation costs nothing until the tab is visible again. |
| E-21 | First Skills badge hovered (`scale: 1.04`) | No longer clipped on the left (FR-7 removes the wrapper clip). |
| E-22 | `prefers-reduced-motion` | Same as `/` today: the effect still reacts to the pointer (non-goal). |

---

## 6. Acceptance criteria

- [ ] **AC-1:** Run `pnpm dev`. On `/`, the glow follows the cursor exactly as before (Image 1): same colours, intensity and decay.
- [ ] **AC-2:** Click **Skills**: on `/chat`, moving the cursor anywhere (gutters, over the card, over the reply, over the bottom bar) still draws the glow behind the UI. Compare against Image 2.
- [ ] **AC-3:** Under the Skills, Contact, Services, Fun and Resume cards, the glow is visible only as a faint tint, and all card text is comfortably readable over the brightest swirls.
- [ ] **AC-4:** Under the AI reply text, the "Me" card's bio, the Services and "My Projects" headings, and the `/chat` empty-state heading, the glow is clearly dimmed. No visible box edge, border or straight cut-off line appears anywhere around the scrim, including at the column's left and right edges on desktop and at 375px.
- [ ] **AC-5:** Clicks, text selection, link clicks inside replies, wheel and touch scrolling, the Home link, the avatar, chips and the input all work on `/chat` as before. Nothing is intercepted by the canvas.
- [ ] **AC-6:** In DevTools, the `FluidCursor` wrapper has `pointer-events: none` and `aria-hidden="true"`, and there's exactly one `canvas#fluid` in the document on both routes.
- [ ] **AC-7:** The bottom bar has no opaque background: the glow is visible around the input pill. The input pill and empty-state suggestions are 90% (80% on hover).
- [ ] **AC-8:** On a touch device or with DevTools touch emulation, the first tap starts the effect, and its speed matches desktop (a single loop).
- [ ] **AC-9:** Performance panel: navigate `/` → `/chat` → `/` → `/chat` with the mouse moving. Each frame has **one** `update` rAF callback, and the listener count on `window` for `mousemove` doesn't grow. (Check with `getEventListeners(window)` in the Chrome console.)
- [ ] **AC-10:** With the Projects carousel on screen, and then with a project modal open, the frame rate stays smooth (no long tasks over 50ms). Record what you see for E-12.
- [ ] **AC-11:** With WebGL disabled (Chrome `--disable-webgl`, or by forcing `getContext` to return `null`), both routes load and work, with one console warning and a plain background.
- [ ] **AC-12:** The avatar fade-on-scroll (spec 03) still works, and the header band looks identical.
- [ ] **AC-13:** At a 375px viewport, nothing scrolls horizontally, and the carousel still scrolls and clips inside its own track.
- [ ] **AC-14:** `pnpm build` succeeds, and `pnpm lint` reports no new errors in the files in Scope. The diff touches only the files in Scope, and `use-FluidCursor.tsx` changes are limited to FR-3.
