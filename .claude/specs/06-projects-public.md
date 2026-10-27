# Spec: Project cards — every code project links to a public repo, and "Live" becomes "jeetkalita.com"

Status: Draft (rev. 1) · Owner: Jeet Kalita · Date: 2026-10-27
Scope: `src/lib/profile.ts` (`PROJECTS` data + one filter), `src/components/projects/Data.tsx` (one class + a dev-only check). Outside the codebase: GitHub repo visibility and clean-up for the repos listed in §3.1 (done by Jeet by hand, see FR-1).

---

## 1. Problem statement

Clicking **Projects** on the landing page asks the assistant to call `getProjects`, and the chat renders `AllProjects` → the card carousel. Tapping a card opens its modal (`ProjectContent` in `Data.tsx`), which ends with a **Links** section: one row per entry in `project.links`, each opening in a new tab. Two problems:

**1. Some projects have no way to see the code.** The Links section only renders when `project.links.length > 0` (`Data.tsx:33`). Three of the eight projects have `links: []` in `profile.ts`, so their modal has no Links section at all. The audit of Jeet's GitHub account (`jeetkalita719`) and local checkouts on 2026-10-27 found:

| Project (`profile.ts`) | Current `links` | Repo | Visibility today |
|---|---|---|---|
| This website | Live, GitHub | `jeet-ai-website` | **public** |
| Job-Intelligence Agent | none | **no repo exists.** The work lives in a Cowork workspace (`E:\Claude\Co-work-JobSearch`) plus a scheduled skill, mixed with personal job-search documents (applications, offers). | n/a |
| Expense-Tracker MCP Server | none | `expense_tracker_local_mcp` (local, FastMCP) and `expense_tracker_mcp_remote` (hosted variant) | **private** (both) |
| YouTube Transcript RAG Chatbot | GitHub | `yt_transcript_chatbot` | public |
| Media Groww | none | not a code project | n/a |
| Book Recommendation System | GitHub | `Book_Recommendation` | public |
| University Course Allocation | GitHub | `course_allocation_system` | public |
| Stationery system — Indian Oil | GitHub | `ioclapp` | public |

So only one project's repo is actually private (Expense-Tracker), one has no repo at all (Job-Intelligence Agent) and one isn't code (Media Groww).

**Making the Expense-Tracker repo public as it stands would leak personal data.** `expense_tracker_local_mcp` has a single commit, "initial commit", that tracks:
- `expenses.db`: a SQLite file with **24 real transactions** (the project description itself says it "logs real transactions"). It is also modified in the working tree, so the next commit would push newer data.
- `__pycache__/main.cpython-310.pyc`: build output.
- An empty `README.md` and no `.gitignore`.

Flipping the switch on GitHub would publish the database from history even if it's deleted in a later commit. The remote variant (`expense_tracker_mcp_remote`) has no `.db` in history, but also has an empty README and a committed `__pycache__`.

**2. The website's link reads "Live".** For "This website", the first link row says **Live** (Image 2). Jeet wants it to read **jeetkalita.com** and stay clickable. Changing only the `name` in `profile.ts` is not enough: the label span has the Tailwind class `capitalize` (`Data.tsx:49`, `text-transform: capitalize`), so `jeetkalita.com` would render as **Jeetkalita.com**.

**Smaller defects found during the investigation:**
- There's no guard against a link that points at a repo that isn't public yet. A private or missing repo returns GitHub's 404 page to a logged-out visitor, and nothing in the code would catch it.
- The same `links` array feeds the system prompt (`prompt.ts:7`, `Links: <name> <url>`), so the assistant would happily hand out a placeholder or 404 URL in text too.
- The `jeet-ai-website` repo's GitHub "Website" field still points at `https://jeet-ai-website.vercel.app`, not `https://jeetkalita.com`.

**Goal.** Every project that has code shows a working **GitHub** row in its modal that a logged-out visitor can open, nothing private leaks on the way, and the website's link row reads `jeetkalita.com`. Decisions for this spec (defaults; confirm or change in §7):
- **Where the repo option lives:** in the existing **Links** section of the card's modal, same row style as today. No new button on the card face.
- **Unfinished links stay hidden.** A link whose URL is still a `{{ FILL: … }}` placeholder is dropped from both the UI and the prompt, using the existing `filled()` helper in `profile.ts`. That lets the data be written now and switched on when the repo is ready.
- **Expense-Tracker links the local server** (`expense_tracker_local_mcp`), because that's what the description talks about, after its history is cleaned (FR-1).
- **Job-Intelligence Agent gets a placeholder**, not a link, until Jeet decides whether to extract a clean public repo (D-1).

---

## 2. Functional requirements

### FR-1: Pre-publish clean-up of each repo going public (manual, by Jeet)
Before a private repo is made public, and before its link is deployed, Jeet does the following for that repo. Claude does not change GitHub visibility or force-push. These are outward-facing, hard-to-reverse actions.
1. **Remove personal data from history, not just from the tip.** For `expense_tracker_local_mcp` the history is a single commit, so the simplest way is to replace it with a fresh root commit that excludes `expenses.db` and `__pycache__/`, then force-push `main`. Rewriting with `git filter-repo --path expenses.db --path __pycache__ --invert-paths` also works. Either way, back up the local `expenses.db` first: the MCP server reads it.
2. **Add a `.gitignore`** with at least `*.db`, `__pycache__/`, `.venv/` and `.env`, so the database can't come back in a later commit.
3. **Make the server create an empty database on first run** if it doesn't already. Someone who clones the repo must be able to run it without Jeet's `expenses.db`. (Check `main.py`. If it already does `CREATE TABLE IF NOT EXISTS`, nothing to change.)
4. **Write a short README**: what it is, how to run it (`uv run …`), how to add it to Claude Desktop, and the list of tools it exposes. An empty README on a public repo linked from the portfolio looks unfinished.
5. **Scan for secrets** in the full history (`git log -p --all | grep -iE "key|token|secret|password"`, or GitHub's secret scanning after it's public). None were found in the current files on 2026-10-27, but check again after any new commits.
6. **Flip visibility** to public in GitHub → Settings → General → Danger Zone.
7. **Verify logged out** (private window): the repo URL returns the repo page, not a 404.

The same checklist applies to `expense_tracker_mcp_remote` if D-2 adds it, and to any future Job-Intelligence Agent repo (D-1).

### FR-2: Each code project lists its GitHub repo
- In `profile.ts`, each project with code has a `{ name: 'GitHub', url: 'https://github.com/jeetkalita719/<repo>' }` entry in `links` (§3.1).
- In the modal, that shows up as a **GitHub** row in the existing Links section. It opens the repo in a new tab with `rel="noopener noreferrer"`, exactly like the rows already there.
- Order within a project: the live site (if any) first, then GitHub.
- No new UI for this: the Links section already renders when `links` is non-empty.

### FR-3: The website's live link reads "jeetkalita.com"
- For "This website", the first link becomes `{ name: 'jeetkalita.com', url: 'https://jeetkalita.com' }`.
- The row renders exactly `jeetkalita.com`, all lowercase. To do that, remove `capitalize` from the link label span in `Data.tsx`. The remaining names (`GitHub`, `jeetkalita.com`) are already written the way they should appear, so nothing else changes visually.
- It stays a full-row link, same as today, with the same chevron, hover state and new-tab behaviour.

### FR-4: Placeholder links are hidden everywhere
- `PROJECTS` filters each project's `links` through `filled(l.url)` before export, the same way `PROFILE.socials` already filters unfilled handles (`profile.ts:42`).
- Because the filter runs in `profile.ts`, the modal **and** the system prompt both see only real links. The assistant never mentions a placeholder URL.
- A project whose links are all placeholders behaves like `links: []` today: no Links section.

### FR-5: Dev-only warning for hidden links
- In development, `Data.tsx` logs one `console.warn` per hidden placeholder link, for example `[projects] Hidden placeholder link "GitHub" on "Job-Intelligence Agent"`, next to the existing duplicate-title check. Production logs nothing.
- To make that possible, the raw (unfiltered) list must be reachable. See §3.2 for how.

### FR-6: Content stays in `profile.ts`
- All link names and URLs live in `PROJECTS`. No URLs in components and no special case for "This website" in `Data.tsx`.

### Non-goals
- No GitHub button or icon on the card face (the carousel card). The repo option is in the modal.
- No new icons, URL subtitles or restyling of the link rows (the only change is removing `capitalize`).
- No link for **Media Groww** (not a code project).
- No live GitHub API call to check visibility or star counts at runtime.
- No change to the `Project` type, `getProjects`, `route.ts`, `tool-renderer.tsx`, `apple-cards-carousel.tsx` or the prompt template in `prompt.ts`. The prompt changes only because its data does.
- No changes to the eight project descriptions, covers or taglines.
- Claude doesn't change repo visibility, rewrite history or force-push. FR-1 is Jeet's to do.
- No light-theme work (the site is forced dark).

---

## 3. API contracts (inputs, outputs, data shapes)

No HTTP, tool or `Project` type changes. `Project.links` keeps its shape `{ name: string; url: string }[]`. `name` is now shown as-is (no `text-transform`), so it must be written the way it should appear.

### 3.1 `PROJECTS` link data (`src/lib/profile.ts`)

| Project | `links` after this change |
|---|---|
| This website | `[{ name: 'jeetkalita.com', url: 'https://jeetkalita.com' }, { name: 'GitHub', url: 'https://github.com/jeetkalita719/jeet-ai-website' }]` |
| Job-Intelligence Agent | `[{ name: 'GitHub', url: '{{ FILL: public repo URL once extracted (D-1) }}' }]` → hidden until filled |
| Expense-Tracker MCP Server | `[{ name: 'GitHub', url: 'https://github.com/jeetkalita719/expense_tracker_local_mcp' }]` (deployed only after FR-1) |
| YouTube Transcript RAG Chatbot | unchanged |
| Media Groww | unchanged (`[]`) |
| Book Recommendation System | unchanged |
| University Course Allocation | unchanged |
| Stationery system — Indian Oil | unchanged |

If FR-1 isn't done yet for Expense-Tracker when this ships, use `'{{ FILL: https://github.com/jeetkalita719/expense_tracker_local_mcp, after FR-1 }}'` instead, so the link stays hidden until the repo is public.

### 3.2 Filtering in `profile.ts`

```ts
// Raw list: links may still be "{{ FILL: … }}" placeholders.
const ALL_PROJECTS: Project[] = [
  /* the eight projects, as today, with the links from §3.1 */
];

// Placeholder links are dropped so neither the cards nor the assistant ever show them.
export const PROJECTS: Project[] = ALL_PROJECTS.map((p) => ({
  ...p,
  links: p.links.filter((l) => filled(l.url)),
}));

// Dev-only: lets Data.tsx warn about links that are still hidden.
export const HIDDEN_PROJECT_LINKS = ALL_PROJECTS.flatMap((p) =>
  p.links.filter((l) => !filled(l.url)).map((l) => ({ project: p.title, link: l.name }))
);
```

`PROJECTS` keeps its name and type, so `Data.tsx` and `prompt.ts` don't need changes to consume it.

### 3.3 `Data.tsx` changes

| Location | Before | After |
|---|---|---|
| `:49` link label span | `font-light capitalize` | `font-light` |
| dev-only block (next to the duplicate-title check, `:68`) | duplicate-title check only | also `for (const h of HIDDEN_PROJECT_LINKS) console.warn(\`[projects] Hidden placeholder link "${h.link}" on "${h.project}"\`);` |
| import | `import { PROJECTS, type Project } from '@/lib/profile';` | `import { HIDDEN_PROJECT_LINKS, PROJECTS, type Project } from '@/lib/profile';` |

### 3.4 What the prompt sees (`prompt.ts:7`, unchanged code)

Before: `Links: Live https://jeetkalita.com, GitHub https://github.com/jeetkalita719/jeet-ai-website`
After: `Links: jeetkalita.com https://jeetkalita.com, GitHub https://github.com/jeetkalita719/jeet-ai-website`
Expense-Tracker gains `Links: GitHub https://github.com/jeetkalita719/expense_tracker_local_mcp`. Job-Intelligence Agent stays link-less until D-1 is filled.

---

## 4. Constraints

- **C-1: Stack.** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4 (CSS-first), shadcn/ui. Prettier: single quotes, semicolons, `es5` commas, `prettier-plugin-tailwindcss`. No new dependencies.
- **C-2: Forced dark theme.** Don't add a light/system toggle.
- **C-3: Order of operations.** A repo becomes public (FR-1, step 7 verified) **before** a commit that links to it is deployed. Otherwise logged-out visitors get a 404 from the portfolio.
- **C-4: No personal data in public history.** `expenses.db` (or any `.db`, `.env`, job-application or offer document) must not be reachable in any commit of a public repo. Deleting it in a new commit doesn't count.
- **C-5: Outward-facing actions are manual.** Visibility changes, history rewrites and force-pushes are done by Jeet. The code change in this spec is safe to merge on its own, because placeholder links are hidden (FR-4).
- **C-6: One source of truth.** Link labels and URLs only in `profile.ts` (CLAUDE.md).
- **C-7: Small diff.** Code changes touch only `src/lib/profile.ts` and `src/components/projects/Data.tsx`.

---

## 5. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| E-1 | "This website" modal | Links: **jeetkalita.com** (lowercase, exactly), then **GitHub**. Both open in a new tab. |
| E-2 | Visitor is already on jeetkalita.com and clicks the jeetkalita.com row | Opens a new tab of the site's landing page. Acceptable; it's the same behaviour "Live" has today. |
| E-3 | Expense-Tracker modal after FR-1 | A Links section appears with one **GitHub** row that opens the public repo. |
| E-4 | Expense-Tracker link shipped before the repo is public | Prevented by C-3. If it happens anyway, visitors see GitHub's 404. Fix: revert to the placeholder (§3.1) or finish FR-1. |
| E-5 | Job-Intelligence Agent, placeholder unfilled | No Links section, same as today. The dev console shows one hidden-link warning. The assistant's prompt has no link for it. |
| E-6 | Media Groww | No Links section (unchanged). |
| E-7 | Visitor asks the assistant "where's the code for the expense tracker?" | It can give the GitHub URL from the prompt. For the Job agent it has no link and must not invent one (existing "never invent" rule). |
| E-8 | A link name with mixed case (`GitHub`) | Shown exactly as written now that `capitalize` is gone. Existing names were already properly cased, so no visual change. |
| E-9 | A future link written in lowercase, e.g. `'demo'` | Shows as `demo`. Write names the way they should appear (§3 note). |
| E-10 | A repo is renamed on GitHub | GitHub redirects the old URL, so the link keeps working. Update `profile.ts` anyway. |
| E-11 | A repo is later made private again | Its row 404s for visitors. Nothing in the code catches this; AC-6 is the manual check. |
| E-12 | Cloned Expense-Tracker run without a `.db` | Server creates an empty database (FR-1 step 3) and works. |
| E-13 | Jeet's local MCP server after the history rewrite | Still uses his backed-up local `expenses.db`, now untracked thanks to `.gitignore`. |
| E-14 | Production build | No hidden-link warnings in the console (dev-only). |
| E-15 | Two links with the same URL in one project | Not present in the data. They would share a React `key` (`link.url`); keep URLs unique per project. |
| E-16 | Mobile 375px, long label | `jeetkalita.com` is shorter than most labels, so it fits on one line next to the chevron. |

---

## 6. Acceptance criteria

- [ ] **AC-1:** Run `pnpm dev`, click **Projects**, open "This website". The first Links row reads exactly **jeetkalita.com** (lowercase j). Clicking it opens `https://jeetkalita.com` in a new tab. Compare against Image 2.
- [ ] **AC-2:** The "This website" GitHub row still opens `https://github.com/jeetkalita719/jeet-ai-website`.
- [ ] **AC-3:** Open Expense-Tracker MCP Server: there's a Links section with a **GitHub** row that opens `https://github.com/jeetkalita719/expense_tracker_local_mcp`. (If FR-1 isn't done, the URL is still a placeholder and the section is absent. That's correct.)
- [ ] **AC-4:** Job-Intelligence Agent and Media Groww show no Links section. The dev console shows exactly one `[projects] Hidden placeholder link` warning (Job agent), and none in `pnpm build && pnpm start`.
- [ ] **AC-5:** Every other project (YouTube RAG, Book Recommendation, Course Allocation, Indian Oil) still shows its GitHub row and opens the same URL as before.
- [ ] **AC-6:** In a private or logged-out browser window, every GitHub URL in `PROJECTS` opens a repo page, not a 404.
- [ ] **AC-7:** For each newly public repo: `git log --all --name-only` shows no `expenses.db`, other `.db`, `.env` or `__pycache__` in any commit. The repo has a `.gitignore` and a non-empty README.
- [ ] **AC-8:** A fresh clone of `expense_tracker_local_mcp` starts with no `expenses.db` present and can add and list an expense.
- [ ] **AC-9:** Ask the assistant "Can I see the code for your expense tracker?". It answers with the public GitHub URL. Ask the same about the Job agent: it doesn't give a URL and doesn't invent one.
- [ ] **AC-10:** `grep -n "capitalize" src/components/projects/Data.tsx` finds nothing. `grep -n "'Live'" src/lib/profile.ts` finds nothing.
- [ ] **AC-11:** `pnpm build` succeeds and `pnpm lint` reports no new errors in the two files in Scope. The diff touches only `src/lib/profile.ts` and `src/components/projects/Data.tsx`.

---

## 7. Decision log

Open decisions for Jeet (rev. 1 ships with the defaults in **bold**):
- **D-1: Job-Intelligence Agent repo.** It has no repo today, and its workspace holds personal job-search documents (applications, offers) that must never be public. Options:
  - **(a) Keep it link-less for now (placeholder, hidden).**
  - (b) Extract only the agent code (discovery, ranking, drafting, triage) into a new clean repo, for example `job-intelligence-agent`, with no personal data, run FR-1 on it, then fill the URL.
  - (c) Leave it link-less permanently and say in the description that it's a private tool.
- **D-2: Expense-Tracker, which repo(s).** **(a) Link only the local server `expense_tracker_local_mcp`** (matches the description). (b) Also add `{ name: 'GitHub (remote)', url: '…/expense_tracker_mcp_remote' }` for the hosted variant, after FR-1 on it too.
- **D-3: GitHub "Website" field of `jeet-ai-website`.** Recommend changing it from `https://jeet-ai-website.vercel.app` to `https://jeetkalita.com` (manual, in the repo's About settings). Not required for this spec.
- **D-4: Label style.** **(a) Plain `jeetkalita.com`** as requested. (b) Add a small external-link or globe icon to rows. Out of scope unless asked.

Audit basis (2026-10-27): GitHub search of `user:jeetkalita719` (public repos only: `authapp`, `ioclapp`, `course_allocation_system`, `loginapp`, `Social-Media-Collab`, `yt_transcript_chatbot`, `Book_Recommendation`, `jeet-ai-website`), plus `git remote` of local checkouts under `E:\Projects` (`MCP/expense-tracker` → `expense_tracker_local_mcp`, `MCP/expense-tracker-remote` → `expense_tracker_mcp_remote`, neither visible publicly).
