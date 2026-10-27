# Spec: Skills card — inner horizontal padding so content stops touching the card edge

Status: Draft (rev. 1) · Owner: Jeet Kalita · Date: 2026-10-26
Scope: `src/components/skills.tsx` (only file modified)

---

## 1. Problem statement

When the visitor clicks the **Skills** quick question (or asks about skills), the assistant calls `getSkills` and `tool-renderer.tsx` renders `<Skills />`. The card's dark background box is drawn correctly, but everything inside it sits flush against its left edge: the "Skills & Expertise" title, each category icon + heading ("AI & LLM engineering", "Machine learning & data", …) and the first badge of every row start at exactly the same x as the card background, with 0px of space. On the right, badges wrap right up to the edge too. The card looks unfinished next to the other cards (Services, Fun), which all have inner padding.

**Root cause.** The card is a shadcn `Card` (`src/components/ui/card.tsx`). The visible box (`bg-card`, `rounded-xl`) is the `Card` element itself. shadcn puts horizontal padding on the children, not on `Card`: `CardHeader` and `CardContent` each default to `px-6`. `skills.tsx` overrides both with `px-0`:

- `skills.tsx:57`: `<CardHeader className="px-0 pb-1">`
- `skills.tsx:63`: `<CardContent className="px-0">`

`Card` has no horizontal padding of its own (`py-6` only; the `px-0` on it at `skills.tsx:56` is a no-op), so with the children zeroed out there's no inset anywhere. The other `px-0` classes in the file (`CardTitle` at `:58`, the section wrappers at `:65` and `:73`) are also no-ops: those elements never had horizontal padding.

**Smaller defect, fixed for free by this change:** every badge has `whileHover={{ scale: 1.04 }}`. The first badge of each row sits on the card's left edge, and `tool-renderer.tsx` wraps every card in `overflow-hidden rounded-lg`, so the left ~2px of a hovered first badge is clipped. With the new padding there's room for the scale.

**Goal.** Keep the card box exactly where and how wide it is today, and inset its contents (title, category headings, badge rows) from the left and right edges so the card looks finished and matches the rest of the site. Decisions taken with Jeet for this spec:
- **Box size:** the card's outer width, position, background, corners and vertical padding stay the same. Only the content moves inward.
- **Both sides:** the inset applies to the right as well as the left, so badge rows wrap before the right edge instead of touching it.

---

## 2. Functional requirements

### FR-1: Horizontal inset for all card content
- The title, every category heading row and every badge row are inset from the card's left and right edges by the same amount.
- Inset is **24px** (`px-6`) below the `md` breakpoint and **32px** (`md:px-8`) from `md` up. This matches `fun.tsx` (`p-6 md:p-8`), the closest comparable card, and shadcn's own `px-6` default.
- Apply it on `CardHeader` and `CardContent` (replacing their `px-0`), not on `Card`. That keeps the shadcn structure intact and keeps the title and the content columns aligned on the same left edge.

### FR-2: The card box doesn't change
- `Card` keeps `w-full border-none pb-12 shadow-none` and its default `bg-card rounded-xl py-6 gap-6`. Its outer width is still the full width of the chat column. Padding is inside the box (Tailwind preflight sets `box-sizing: border-box`), so the box doesn't get wider.
- The outer `motion.div` (`mx-auto w-full max-w-5xl rounded-4xl`) and its entrance animation are unchanged.
- The card can get **taller** by one row in some sections, because the content area is up to 64px narrower and a badge row may wrap one badge earlier. That's expected and acceptable; its width doesn't change.

### FR-3: Alignment
- The title's first letter, each category icon and the first badge of each row all start on the same vertical line (the new left inset). No element gets its own extra offset.
- Vertical spacing (`pb-1` on the header, `space-y-8` between sections, `space-y-3` inside a section, `gap-2` between badges, `pb-12` at the bottom) is unchanged.

### FR-4: Remove the dead `px-0` classes
- Remove `px-0` from `Card` (`:56`), `CardTitle` (`:58`), the sections container (`:65`) and each section wrapper (`:73`). They do nothing today and they read as if they were responsible for the layout, which is how the flush-left bug was hidden.

### Non-goals
- No change to badge styling (colour, size, `px-3 py-1.5`, `font-normal`), the hover scale, or the stagger animations.
- No change to the card's vertical padding, background colour, corner radius or border.
- No change to `src/components/ui/card.tsx` or `badge.tsx` (shared shadcn primitives; other components use them).
- No change to `tool-renderer.tsx` or its `overflow-hidden rounded-lg` wrapper.
- No change to `SKILLS` in `profile.ts`, the `getSkills` tool, `route.ts` or `prompt.ts`.
- No padding fixes in other cards. If the same flush-left issue exists elsewhere, it gets its own spec.
- No light-theme work (the site is forced dark).

---

## 3. API contracts (inputs, outputs, data shapes)

No HTTP, LLM tool or `profile.ts` contract changes. `Skills` still takes no props and still reads `SKILLS` from `profile.ts`. The only contract is the class lists in `skills.tsx`.

### 3.1 Class changes in `src/components/skills.tsx`

| Line | Element | Before | After |
|---|---|---|---|
| 56 | `Card` | `w-full border-none px-0 pb-12 shadow-none` | `w-full border-none pb-12 shadow-none` |
| 57 | `CardHeader` | `px-0 pb-1` | `px-6 pb-1 md:px-8` |
| 58 | `CardTitle` | `text-primary px-0 text-4xl font-bold` | `text-primary text-4xl font-bold` |
| 63 | `CardContent` | `px-0` | `px-6 md:px-8` |
| 65 | sections `motion.div` | `space-y-8 px-0` | `space-y-8` |
| 73 | section `motion.div` | `space-y-3 px-0` | `space-y-3` |

Class order in the "After" column is what `prettier-plugin-tailwindcss` produces. Run Prettier on the file rather than hand-ordering.

### 3.2 Resulting structure (abridged)

```tsx
<Card className="w-full border-none pb-12 shadow-none">
  <CardHeader className="px-6 pb-1 md:px-8">
    <CardTitle className="text-primary text-4xl font-bold">
      Skills & Expertise
    </CardTitle>
  </CardHeader>

  <CardContent className="px-6 md:px-8">
    <motion.div className="space-y-8" /* variants unchanged */>
      {skillsData.map((section, index) => (
        <motion.div key={index} className="space-y-3" variants={itemVariants}>
          {/* icon + h3 row, badge row: unchanged */}
        </motion.div>
      ))}
    </motion.div>
  </CardContent>
</Card>
```

---

## 4. Constraints

- **C-1: Stack.** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4 (CSS-first, no `tailwind.config.js`), shadcn/ui new-york. Prettier: single quotes, semicolons, `es5` commas, `prettier-plugin-tailwindcss` for class order. No new dependencies.
- **C-2: Forced dark theme.** Don't add a light/system toggle.
- **C-3: Don't edit shared primitives.** `Card`, `CardHeader` and `CardContent` are used across the site. Fix the spacing at the call site in `skills.tsx`.
- **C-4: `cn()` merge order.** shadcn primitives merge `className` with `tailwind-merge`, so a `px-6`/`md:px-8` passed in wins over any conflicting default. Don't try to set the padding through a wrapper `div` with its own background; the background must stay on `Card`.
- **C-5: No layout shift beyond the card.** The change is internal padding only. Nothing outside the card moves, and the chat column's width is unaffected.
- **C-6: Single file.** All changes are in `src/components/skills.tsx`.

---

## 5. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| E-1 | Desktop (≥ 768px) | 32px inset on both sides. Title, icons and first badges line up on one vertical line. |
| E-2 | Mobile (375px) | 24px inset on both sides. Content width is at most about 375 − 48 (chat gutters: `px-2` on the scroll container + `px-4` in `SimplifiedChatView`) − 48 ≈ 280px, a little less if the chat bubble adds its own padding. The widest badge, "MCP (Model Context Protocol)" (`text-xs`, `px-3`, `whitespace-nowrap`), is about 200px and still fits on one line. No horizontal page scroll. |
| E-3 | A badge wider than the content box (a future long skill name in `profile.ts`) | Badges are `whitespace-nowrap` and `overflow-hidden`, so it would overflow the content box into the padding and be clipped by the tool-renderer wrapper. Out of scope; keep skill names short (as today). |
| E-4 | Badge rows that exactly filled the old width | The last badge wraps to a new row. The card grows taller by one row (~40px); its width is unchanged (FR-2). |
| E-5 | Hovering the first badge in a row | It scales to 1.04 without being clipped on the left (fixed by the new inset). |
| E-6 | Hovering the last badge in a row | Same: there's now at least 24px of room on the right. |
| E-7 | Category with no matching icon (`iconFor` fallback to `Code`) | Unaffected; the fallback icon sits on the same inset line. |
| E-8 | Long category heading on mobile | Wraps inside the content box as today, now inset from both edges. |
| E-9 | Entrance and stagger animations | Unchanged. The card scales in, sections fade up, badges pop in, all already inside the inset. |
| E-10 | Assistant calls `getSkills` twice in one chat | Each render is the same component with the same padding. No difference from today. |

---

## 6. Acceptance criteria

- [ ] **AC-1:** Run `pnpm dev`, click **Skills** on the landing page (or ask "what are your skills?"). The title, every category heading and every badge row are visibly inset from the card's left edge. Compare against the bug screenshot.
- [ ] **AC-2:** Badge rows also stop short of the card's right edge.
- [ ] **AC-3:** In DevTools, the `Card` element (`data-slot="card"`) has the same width before and after the change at 1280px and 375px viewports. Its left/right position, background, corner radius and `py-6`/`pb-12` padding are unchanged.
- [ ] **AC-4:** The computed `padding-left` and `padding-right` of `CardHeader` and `CardContent` are 24px below 768px and 32px at 768px and up.
- [ ] **AC-5:** The title's first letter, each category icon and the first badge of each row share the same left x (check with the DevTools element overlay or a ruler extension).
- [ ] **AC-6:** Hovering the first and last badge in a row scales them without visible clipping.
- [ ] **AC-7:** At a 375px viewport, no badge overflows the content box and the page doesn't scroll horizontally.
- [ ] **AC-8:** `skills.tsx` contains no `px-0` classes.
- [ ] **AC-9:** `pnpm build` succeeds, and `pnpm lint` reports no new errors in `skills.tsx`. The diff touches only `src/components/skills.tsx`.
