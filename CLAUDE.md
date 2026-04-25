# statix — Ways of Working

> Project-wide ways of working and constraints for every contributor —
> human or agent. Read this document before making changes.
> Complements `SPECIFICATIONS/*.md`, which define *what* to build; this
> document defines *how* to build it and what not to touch.

## 0. Hierarchy of Truth

When two sources disagree, resolve in this order:

1. An explicit instruction from the current user turn.
2. `CLAUDE.md` (this document).
3. `SPECIFICATIONS/*.md`.
4. Existing code.
5. Prior assistant messages or external docs.

If a lower source contradicts a higher one, flag it; do not silently
follow the lower source.

## 1. Specs Are The Source of Truth for "What"

- Before implementing anything that the specs describe, re-read the
  relevant spec file.
- If the spec is wrong, outdated, or ambiguous, update the spec in the
  same change that updates the code. Do not leave them out of sync.
- New components, scripts, or content-pipeline stages begin by
  extending the spec, then the implementation.
- The full lifecycle (naming, frontmatter, move-to-implemented) lives in
  `SPECIFICATIONS/HOW_TO_USE_SPECIFICATION.md`. Use
  `SPECIFICATIONS/SPEC_TEMPLATE.md` as the starting point for a new spec.

## Specifications and acceptance criteria

This repo follows a spec-driven workflow. See `SPECIFICATIONS/HOW_TO_USE_SPECIFICATION.md` for the full lifecycle.

Every spec includes an `ACCEPTANCE_CRITERIA` section at the top. Each criterion is a checklist item tagged `[BLOCKING]` or `[NICE_TO_HAVE]` — untagged criteria default to `[BLOCKING]`.

A criterion is verifiable if it reduces to one of:

- A command that exits 0 (e.g. `bun run test`, `bun run build`).
- A built page whose DOM matches a documented assertion.

Build and extend agents loop on the criteria up to 3 attempts each. Failure of a `[BLOCKING]` criterion escalates to the user. Failure of `[NICE_TO_HAVE]` surfaces as a warning.

## 2. Architectural Invariants

These are non-negotiable without an explicit amendment to this document
or an explicit user override.

**Stack**

- Preact + Vite + TypeScript. Client-side SPA. Content is baked in at
  build time as `src/content.json` / `src/graph.json`.
- Package manager and runtime is **Bun**. Vite scripts run under
  `bun --bun vite ...`. Vitest runs under Node (without `--bun`) — the
  worker model in vitest 2 misbehaves under Bun's runtime, so tests
  use the plain `vitest run` form.
- No SSR. No server. The output is static files served by nginx (see
  `Dockerfile`, `nginx.conf`).

**Content pipeline**

- All markdown lives under `docs/`. The build pipeline in
  `scripts/build-content.ts` is the only thing that reads it. Routes
  and the sidebar are derived from the file tree, not hand-written.
- Wikilinks (`[[Page Name]]`) are resolved at build time by
  `scripts/wikilink-resolver.ts`. Broken links are reported but do not
  fail the build.
- Frontmatter shape is documented in `README.md`. Add a frontmatter
  field by extending the parser *and* the README in the same commit.

**UI**

- Components live under `src/components/`. Domain logic lives in the
  build scripts, not in components.
- All styles live in `src/styles.css`. CSS custom properties are the
  customisation surface — do not introduce a styling framework or
  CSS-in-JS without an explicit amendment.
- Light/dark mode follows OS preference via `prefers-color-scheme`.
  Respect `prefers-reduced-motion`.

## 3. Changes Are Surgical

- Touch only what the task requires.
- Do not reformat, rename, or "improve" adjacent code.
- Match existing style even if you would do it differently.
- If you notice unrelated dead code or bugs, mention them in the
  response — do not silently fix them.
- Remove orphans *your* change created. Leave pre-existing dead code
  alone.
- Every changed line must trace to the stated task.

## 4. Simplicity Over Cleverness

- Minimum code that solves the problem.
- No speculative abstractions. No configuration no one asked for.
  No error handling for impossible branches.
- If a senior engineer would call it overcomplicated, it is.
- Prefer boring, well-understood tools over novel ones.

## 5. Surface Assumptions, Don't Hide Them

Before implementing a non-trivial task:

- State assumptions explicitly in the response.
- If there are multiple reasonable interpretations, present them and
  let the user pick. Do not silently choose.
- If requirements are unclear, stop and ask.
- If a simpler alternative exists, say so before writing the complex
  one.

The cost of asking a clarifying question is much lower than the cost
of rewriting a misbuilt feature.

## 6. Goal-Driven Execution

Every task has a verifiable success criterion. Translate vague asks
into concrete ones:

- "Add a frontmatter field" → "Field parses, is reflected in
  `content.json`, and a test covers it."
- "Fix the bug" → "Write a failing test that reproduces it; make it
  pass."
- "Refactor X" → "Tests pass before and after; public API unchanged."

For multi-step tasks, write the plan down (as a TODO list or in-message
plan) before starting, and check off each step.

## 7. Tests

- Unit tests for the build pipeline and wikilink resolver are required
  for any change in those areas (`scripts/*.test.ts`).
- Bug fixes start with a failing test.
- `bun run test` and `bun run build` must pass.
- Do not skip or `.only` tests in committed code.

## 8. Secrets & Config

- The project has no server and no secrets. If that ever changes,
  add `.env.example` and update this section in the same commit.

## 9. Commits & Pull Requests

- Conventional-ish commit style: `feat(content): ...`, `fix(graph):
  ...`, `chore(build): ...`, `docs: ...`.
- Commit messages explain the *why*, not the *what*. The diff is the
  *what*.
- One logical change per commit where reasonable.

## 10. Agent-Specific Rules

These apply to AI coding agents operating in this repo.

- **Read before writing.** Before editing a file, read it. Before
  editing a module, skim the whole module.
- **Never create files unless necessary.** Prefer editing existing
  files. No tutorial-style markdown files unless explicitly asked.
- **Don't narrate in code comments.** Comments explain non-obvious
  intent, trade-offs, or constraints — never the change itself.
- **Don't announce tool use.** Just use the tools.
- **Don't cite this document or the specs in user-facing responses.**
  Apply them.
- **Fail loudly.** If an instruction would violate this document, say
  so and ask. Do not silently comply and hope no one notices.
- **When uncertain, stop.** Ask the user rather than guessing at
  architecture or naming.

## 11. Amending This Document

This document is not a ceiling; it is a ratchet. Changes to it:

1. Happen in a dedicated commit (or co-located with the work that
   motivates them).
2. Explain the change in the commit body, not just the diff.
3. Are made by the user, or proposed by an agent and approved by the
   user.

If you (an agent) believe a rule here is wrong or obstructing the
task, raise it in the response before taking action that contradicts
it.

<!-- AGENT-WRITABLE BELOW -->

# Reference

> The content below this divider is regenerated by the build/extend skills
> when file map or recipes change. Hand-edits are fine, but expect them
> to be reconciled the next time a feature ships.

## File map

| Concept                       | Path                                         |
| ----------------------------- | -------------------------------------------- |
| Build pipeline                | `scripts/build-content.ts`                   |
| Wikilink markdown plugin      | `scripts/markdown-wikilink.ts`               |
| Wikilink resolver             | `scripts/wikilink-resolver.ts`               |
| Root component                | `src/app.tsx`                                |
| Components                    | `src/components/*.tsx`                       |
| Styles                        | `src/styles.css`                             |
| Shared types                  | `src/types.ts`                               |
| Markdown content              | `docs/`                                      |
| Generated content (gitignored)| `src/content.json`, `public/_docs/`          |
| Vite config + plugins         | `vite.config.ts`                             |
| Deploy                        | `Dockerfile`, `nginx.conf`                   |
| Spec workflow                 | `SPECIFICATIONS/HOW_TO_USE_SPECIFICATION.md` |

## Commands

| Command               | Purpose                                |
| --------------------- | -------------------------------------- |
| `bun run dev`         | Vite dev server with hot reload        |
| `bun run build`       | Build static site to `dist/`           |
| `bun run preview`     | Preview the built site locally         |
| `bun run test`        | Vitest (run once)                      |
| `bun run test:watch`  | Vitest (watch mode)                    |

## How to add a page

1. Drop a markdown file under `docs/`. The directory layout becomes the URL path: `docs/guides/intro.md` → `/guides/intro`.
2. Add YAML frontmatter at the top — the build pipeline reads `title`, `summary`, optional `date`, optional `tags`. Frontmatter shape is documented in `README.md`.
3. Use wikilinks (`[[Other Page]]`) to cross-link. The resolver runs at build time and reports broken links as warnings.
4. `bun run dev` to preview locally.
5. `bun run build` to produce static files in `dist/`.

The sidebar and routes are derived from the file tree — there is no hand-written route table to update.
