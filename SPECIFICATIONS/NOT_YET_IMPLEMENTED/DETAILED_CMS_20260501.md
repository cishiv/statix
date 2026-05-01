---
spec_type: "detailed"
mode: "feature"
name: "CMS"
date_started: "2026-05-01"
template: "statix"
status: "NOT_YET_IMPLEMENTED"
parent_spec: "../IMPLEMENTED/IMPLEMENTED_MVP_20260501_SPEC.md"
---

# CMS — Local-only markdown editor for `docs/`

A localhost-only authoring tool for editing the `docs/` tree before
committing. Runs via `bun run cms`, never ships in `dist/`, and reuses
the existing markdown + wikilink pipeline so what you preview is what
the build produces.

## ACCEPTANCE_CRITERIA

### 1. Authoring (CRUD + move)

#### 1.1 List docs [BLOCKING]

**Pre-conditions:** the CMS server is running.

WHEN the editor requests `GET /api/tree`, the system shall return the full `docs/` tree with parsed frontmatter (title, order, hidden) for every `.md` file.

#### 1.2 Read doc [BLOCKING]

**Pre-conditions:** the requested path exists under `docs/`.

WHEN the editor requests `GET /api/doc?path=<rel>`, the system shall return the raw markdown body.

#### 1.3 Create / update [BLOCKING]

**Pre-conditions:** the requested path is under `docs/` and ends in `.md`.

WHEN the editor sends `PUT /api/doc?path=<rel>` with markdown, the system shall write the file (creating parent directories as needed) and return the updated tree entry.

#### 1.4 Delete [BLOCKING]

**Pre-conditions:** the requested path exists under `docs/`.

WHEN the editor sends `DELETE /api/doc?path=<rel>`, the system shall remove the file and return the updated tree.

#### 1.5 Move with wikilink fixup [BLOCKING]

**Pre-conditions:** `from` and `to` are both under `docs/`; `from` exists and `to` does not.

WHEN the editor sends `POST /api/doc/move` with `{from, to}`, the system shall rename the file (using `git mv` if tracked, plain rename otherwise) and silently update incoming wikilinks to the moved page across all other docs.

#### 1.6 Path-escape rejection [BLOCKING]

**Pre-conditions:** the CMS server is running.

IF a doc path resolves outside `docs/` after normalisation, THEN the system shall reject the request with HTTP 400 and not touch the filesystem.

### 2. Wikilink autocomplete

#### 2.1 Index endpoint [BLOCKING]

**Pre-conditions:** the CMS server is running.

WHEN the editor requests `GET /api/links`, the system shall return every page's title and slug.

#### 2.2 Trigger [BLOCKING]

**Pre-conditions:** the user is editing a markdown body in the CMS UI.

WHEN the user types `[[`, the system shall present a dropdown listing pages from the link index.

#### 2.3 Filter [BLOCKING]

**Pre-conditions:** the autocomplete dropdown is open.

WHILE the user types after `[[`, the system shall narrow the dropdown to entries whose title or slug contains the typed substring (case-insensitive).

#### 2.4 Insertion [BLOCKING]

**Pre-conditions:** an autocomplete entry is selected.

WHEN the user confirms the selection (Enter or click), the system shall insert `[[Title]]` and close the dropdown.

### 3. Live preview

#### 3.1 Pipeline reuse [BLOCKING]

**Pre-conditions:** the CMS server is running.

WHEN the editor sends `POST /api/preview` with a markdown body and the doc's path, the system shall render HTML using the same `markdown-wikilink` plugin and `wikilink-resolver` modules used by `bun run build`.

#### 3.2 Live updates [BLOCKING]

**Pre-conditions:** a doc is open in the editor.

WHILE the user types, the system shall refresh the preview pane (debounced ≤300ms) without losing scroll position.

#### 3.3 Visual fidelity [NICE_TO_HAVE] [USER_VERIFIES]

**Pre-conditions:** preview is rendering.

The preview pane visually matches a published page (font, spacing, heading rhythm, link styling). Verified by the user.

### 4. Git: stage + commit

#### 4.1 Status [BLOCKING]

**Pre-conditions:** the CMS server is running inside a git working tree.

WHEN the editor requests `GET /api/git/status`, the system shall return porcelain status restricted to paths under `docs/`.

#### 4.2 Stage known docs [BLOCKING]

**Pre-conditions:** every requested path is under `docs/` and is not git-ignored.

WHEN the editor sends `POST /api/git/stage` with paths, the system shall run `git add` for those paths only.

#### 4.3 Reject foreign stage [BLOCKING]

**Pre-conditions:** the CMS server is running.

IF a stage request references any path outside `docs/`, THEN the system shall reject with HTTP 400 and stage nothing.

#### 4.4 Commit [BLOCKING]

**Pre-conditions:** at least one path is staged in the index.

WHEN the editor sends `POST /api/git/commit` with a non-empty message, the system shall run `git commit -m <msg>` and return the new HEAD sha.

#### 4.5 Empty-message rejection [BLOCKING]

**Pre-conditions:** the CMS server is running.

IF a commit request has an empty or whitespace-only message, THEN the system shall reject with HTTP 400 and not invoke git.

#### 4.6 Disabled commit button [BLOCKING]

**Pre-conditions:** the editor UI is open.

WHILE no docs are staged, the system shall disable the commit button.

### 5. Isolation & safety

#### 5.1 Localhost only [BLOCKING]

**Pre-conditions:** the CMS server is running.

WHILE running, the system shall bind only to `127.0.0.1`.

#### 5.2 Excluded from build [BLOCKING]

**Pre-conditions:** the CMS code is in the repo.

WHEN `bun run build` runs, the system shall not include any CMS server or UI artefacts in `dist/`.

#### 5.3 Auto-open browser [NICE_TO_HAVE]

**Pre-conditions:** `bun run cms` has just started successfully.

WHEN the server is ready, the system shall open the user's default browser to the editor URL.

## Problem statement

The current authoring loop is "edit `.md` in your IDE, run `bun run
dev`, eyeball preview, switch to terminal to commit." That works but
loses the affordances markdown CMSs offer — wikilink completion,
side-by-side preview using the real build pipeline, and a clean
staging UI for the `docs/` subset of the working tree.

This feature wraps those affordances around the existing pipeline as a
localhost-only tool. It does not change deploy shape, does not add a
server runtime to the published artefact, and does not introduce auth.
It is a developer tool that lives on the contributor's machine.

## User flows

- **Open**: contributor runs `bun run cms`. Browser opens to
  `http://127.0.0.1:5174/`. Tree of `docs/` is on the left.
- **Edit**: pick a doc → editor + live preview pane. Typing `[[`
  triggers a dropdown of pages; selecting one inserts a wikilink.
- **Create / move / delete**: tree-pane actions create new files,
  rename / move them (incoming wikilinks updated silently), or
  delete.
- **Commit**: bottom bar shows dirty docs + a message field. "Stage"
  adds them to the index, "Commit" creates the commit. Push is left
  to the contributor's terminal.

## Content model changes

None. The CMS reads and writes the existing frontmatter shape; it does
not introduce new fields.

## Architecture hints

- **Server**: `cms/server.ts` using `Bun.serve()`, bound to
  `127.0.0.1`. Routes split into `cms/api/{docs,preview,links,git}.ts`.
  Spawn git via `Bun.$`.
- **UI**: `cms/ui/` — small Preact app, single bundle. Tree, editor,
  preview, commit bar. CodeMirror 6 for the editor with markdown mode
  and an autocomplete extension keyed on `[[`.
- **Pipeline reuse**: `cms/api/preview.ts` imports
  `scripts/markdown-wikilink.ts` and `scripts/wikilink-resolver.ts`
  directly — no duplicated rendering code.
- **Path safety**: a single helper resolves and validates every path
  request (pure function, unit-tested) so escapes are caught
  uniformly.
- **Build exclusion**: the CMS is not imported from `src/` and is not
  referenced by `vite.config.ts`. `bun run build` reaches no CMS code.

## Integrations

- **Existing markdown pipeline** (`scripts/markdown-wikilink.ts`,
  `scripts/wikilink-resolver.ts`) for preview rendering.
- **Git** via `Bun.$` for status, stage, commit, and `git mv`.
- **CodeMirror 6** for the editor (`@codemirror/lang-markdown`,
  `@codemirror/autocomplete`).
- **Preact + Vite** for the editor UI bundle, served by the CMS
  server.

## Out of scope

- Auth and multi-user. Localhost only.
- Push, pull, branch operations. Commit only.
- Image upload via drag-drop. Co-located images managed manually.
- Frontmatter form UI (typed fields). Frontmatter is edited as YAML in
  the body.
- Search across doc bodies. Filter only by tree path / title.
- Diff viewer / undo stack beyond the editor's local history.
- Production deploy of the CMS. The CMS never ships.
