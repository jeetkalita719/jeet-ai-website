# Spec: Notes wall — show each visitor note inside double quotes

Status: Approved (rev. 1) · Owner: Jeet Kalita · Date: 2026-10-28
Scope: `src/components/contact/notes-wall.tsx` (only source file modified)

---

## 1. Problem statement

On the Contact card's **Notes from visitors** wall, each note's text is rendered bare (`Hi Jeet bro, great to see…`). It doesn't read as something a visitor said, and the cards look plainer than they should.

**Root cause.** `notes-wall.tsx` renders `{note.text}` directly inside the text `<p>` with no surrounding punctuation.

**Smaller defect, handled by this change:** visitors sometimes type their own quotes. Naively wrapping would show `““nice site””`.

**Goal.** Show every note as `“…”` (typographic double quotes). Everything else on the wall stays exactly as it is.

---

## 2. Functional requirements

### FR-1: Wrap note text in curly double quotes
- The note text renders as `“{text}”` inside the existing `<p>` (same classes, same element).
- Curly `“ ”`, not straight `"`, to match the em dash already used in the attribution line.

### FR-2: Don't double up visitor-typed quotes
- If the whole note is wrapped in one pair of quote characters (`" “ ” ' ‘ ’`), that pair is dropped for display before ours are added.
- Quotes inside the text are left untouched.

### Non-goals
- No change to stored notes, `src/lib/notes.ts` validation, `/api/notes`, or the composer.
- No change to card size, layout, colours, attribution line, scroll hint or animations.

---

## 3. API contracts

None. Display-only change. `Note` shape is unchanged.

---

## 4. Constraints

- **C-1:** Single source file, no new dependencies.
- **C-2:** The flying card (`layoutId="note-draft"`) and reduced-motion paths are unaffected; quotes are plain text in the same element.

---

## 5. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| E-1 | `"nice site"` typed with quotes | `“nice site”` (single pair) |
| E-2 | `I said "hi"` | `“I said "hi"”` (inner quotes kept) |
| E-3 | Note is only quote chars (`""`) | Falls back to the original text, wrapped: `“""”` |
| E-4 | Long note hits `line-clamp-4` | Ellipsis may hide the closing `”`. Acceptable (80-char max makes this rare) |
| E-5 | Emoji / non-Latin text | Unaffected |

---

## 6. Acceptance criteria

- [ ] **AC-1:** Existing notes render as `“Hi Jeet bro, great to see…”`; card height, grid and attribution unchanged.
- [ ] **AC-2:** A newly published note still flies into the wall and lands with quotes.
- [ ] **AC-3:** Publishing `"testing quotes"` shows one pair of quotes, not two.
- [ ] **AC-4:** `pnpm lint` reports no new errors; the diff touches only `notes-wall.tsx` (plus this spec).
