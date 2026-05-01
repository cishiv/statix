---
spec_type: "mvp"
mode: "feature"
name: "CMS"
date_started: "2026-05-01"
template: "statix"
status: "IMPLEMENTED"
parent_spec: "../NOT_YET_IMPLEMENTED/DETAILED_CMS_20260501.md"
---

# CMS — MVP

The minimum viable slice of the CMS. The full vision lives in
`../NOT_YET_IMPLEMENTED/DETAILED_CMS_20260501.md`. Deferred items
live in `../NOT_YET_IMPLEMENTED/MVP_CMS_20260501_DEFERRED.md`.

## ACCEPTANCE_CRITERIA

### 1. Authoring (CRUD + move)

#### 1.1 List docs [BLOCKING]

**Pre-conditions:** the CMS server is running.

WHEN the editor requests `GET /api/tree`, the system shall return the full `docs/` tree with parsed frontmatter for every `.md` file.

#### 1.2 Read doc [BLOCKING]

**Pre-conditions:** the requested path exists under `docs/`.

WHEN the editor requests `GET /api/doc?path=<rel>`, the system shall return the raw markdown body.

#### 1.3 Create / update [BLOCKING]

**Pre-conditions:** the requested path is under `docs/` and ends in `.md`.

WHEN the editor sends `PUT /api/doc?path=<rel>` with markdown, the system shall write the file (creating parent directories as needed).

#### 1.4 Delete [BLOCKING]

**Pre-conditions:** the requested path exists under `docs/`.

WHEN the editor sends `DELETE /api/doc?path=<rel>`, the system shall remove the file.

#### 1.5 Move with wikilink fixup [BLOCKING]

**Pre-conditions:** `from` and `to` are both under `docs/`; `from` exists and `to` does not.

WHEN the editor sends `POST /api/doc/move` with `{from, to}`, the system shall rename the file (using `git mv` when tracked) and silently update incoming wikilinks across all other docs.

#### 1.6 Path-escape rejection [BLOCKING]

IF a doc path resolves outside `docs/` after normalisation, THEN the system shall reject the request with HTTP 400.

### 2. Wikilink autocomplete

#### 2.1 Trigger and filter [BLOCKING]

**Pre-conditions:** the user is editing a markdown body.

WHEN the user types `[[`, the system shall present a dropdown of pages, filtered (case-insensitive) by characters typed afterward.

#### 2.2 Insertion [BLOCKING]

**Pre-conditions:** an autocomplete entry is selected.

WHEN the user confirms the selection, the system shall insert `[[Title]]` and close the dropdown.

### 3. Live preview

#### 3.1 Pipeline reuse [BLOCKING]

WHEN the editor sends `POST /api/preview`, the system shall render HTML using the same `markdown-wikilink` plugin and `wikilink-resolver` modules as `bun run build`.

#### 3.2 Live updates [BLOCKING]

**Pre-conditions:** a doc is open.

WHILE the user types, the system shall refresh the preview pane (debounced ≤300ms).

### 4. Git: stage + commit

#### 4.1 Status [BLOCKING]

WHEN the editor requests `GET /api/git/status`, the system shall return porcelain status restricted to paths under `docs/`.

#### 4.2 Stage known docs [BLOCKING]

WHEN the editor sends `POST /api/git/stage` with paths under `docs/`, the system shall run `git add` for those paths only.

#### 4.3 Reject foreign stage [BLOCKING]

IF a stage request includes any path outside `docs/`, THEN the system shall reject with HTTP 400 and stage nothing.

#### 4.4 Commit [BLOCKING]

**Pre-conditions:** at least one path is staged.

WHEN the editor sends `POST /api/git/commit` with a non-empty message, the system shall run `git commit -m <msg>` and return the new HEAD sha.

#### 4.5 Disabled commit button [BLOCKING]

WHILE no docs are staged, the system shall disable the commit button.

### 5. Isolation

#### 5.1 Localhost only [BLOCKING]

WHILE running, the system shall bind only to `127.0.0.1`.

#### 5.2 Excluded from build [BLOCKING]

WHEN `bun run build` runs, the system shall not include any CMS artefacts in `dist/`.

## Problem statement

See `../NOT_YET_IMPLEMENTED/DETAILED_CMS_20260501.md`.

## User flows

The MVP supports the core loop: open the CMS → edit a doc → preview →
stage → commit. Tree-pane create / rename / delete are included
because the user named c/r/d/m all in scope.

## Content model changes

None.

## Architecture hints

See the detailed spec. The MVP is implementable in:

- `cms/server.ts` (Bun.serve, route table, path-safety helper).
- `cms/api/{docs,preview,links,git}.ts`.
- `cms/ui/` (Preact app, CodeMirror 6 editor).
- A `cms` script in `package.json` → `bun run cms/server.ts`.

## Integrations

- `scripts/markdown-wikilink.ts`, `scripts/wikilink-resolver.ts` for
  preview (via `renderPageHtml` exported from `build-content.ts`).
- Git via `node:child_process` (works under both Bun runtime and
  Node, the latter for vitest).
- CodeMirror 6 (`codemirror`, `@codemirror/lang-markdown`,
  `@codemirror/autocomplete`).

## Out of scope

Tracked in `../NOT_YET_IMPLEMENTED/MVP_CMS_20260501_DEFERRED.md`.
Headlines:

- Visual-fidelity polish for the preview pane (USER_VERIFIES).
- Auto-open browser on `bun run cms`.
- Image upload, frontmatter form UI, body search, diff viewer.
- Push / branch operations.
