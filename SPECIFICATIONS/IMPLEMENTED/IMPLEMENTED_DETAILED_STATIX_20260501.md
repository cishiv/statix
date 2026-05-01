---
spec_type: "detailed"
mode: "project"
name: "STATIX"
date_started: "2026-05-01"
template: "statix"
status: "IMPLEMENTED"
parent_spec: ""
---

# Statix — Project (retroactive)

> Retroactive backfill describing the shipped state of the repo as of
> 2026-05-01. Authored so feature specs have a well-formed parent
> chain to anchor against. Not authored before the implementation —
> the project predates the spec.

## ACCEPTANCE_CRITERIA

### 1. Content pipeline

#### 1.1 Markdown scan [BLOCKING]

**Pre-conditions:** at least one `.md` file exists under `docs/`.

WHEN `bun run build` runs, the system shall walk `docs/` recursively and produce `src/content.json` with one entry per markdown file.

#### 1.2 Frontmatter parsing [BLOCKING]

**Pre-conditions:** a doc has YAML frontmatter.

WHEN the build pipeline parses a doc, the system shall extract `title`, `summary`, `order`, `hidden`, `date`, `updated`, `group`, `hide_in_graph`, and `tags` per `README.md`.

#### 1.3 Route derivation [BLOCKING]

**Pre-conditions:** a doc lives at `docs/<dir>/<file>.md`.

WHEN the SPA boots, the system shall serve the doc at `/<dir>/<file>` (or `/` for `docs/index.md`).

### 2. Wikilinks

#### 2.1 Resolution [BLOCKING]

**Pre-conditions:** a doc body contains `[[Title]]` and a doc with a matching title or slug exists.

WHEN the build pipeline processes the doc, the system shall rewrite the wikilink to the resolved page's route.

#### 2.2 Broken-link reporting [BLOCKING]

**Pre-conditions:** a wikilink references a title with no match.

WHEN the build pipeline processes the doc, the system shall log the broken link and continue the build with the link rendered as an unresolved span.

### 3. Navigation & rendering

#### 3.1 Sidebar [BLOCKING]

**Pre-conditions:** `src/content.json` is present at runtime.

WHEN the SPA renders, the system shall build a sidebar tree from the doc structure, ordered by `order` then alphabetical, hiding entries with `hidden: true`.

#### 3.2 Mobile sidebar [BLOCKING]

**Pre-conditions:** viewport width is below 768px.

WHEN the SPA renders, the system shall present a hamburger button that toggles an overlay sidebar.

### 4. Theming & accessibility

#### 4.1 Color scheme [BLOCKING]

WHILE the user's OS reports a `prefers-color-scheme` value, the system shall apply the matching theme without a manual toggle.

#### 4.2 Reduced motion [BLOCKING]

WHILE `prefers-reduced-motion: reduce` is set, the system shall suppress route-transition fades.

### 5. Build & deploy

#### 5.1 Static build [BLOCKING]

WHEN `bun run build` succeeds, the system shall emit a fully static site to `dist/` with no server runtime dependency.

#### 5.2 Docker image [BLOCKING]

**Pre-conditions:** a successful build artefact in `dist/`.

WHEN the included `Dockerfile` is built, the system shall produce an nginx image serving `dist/` on port 8080.

### 6. Knowledge graph

#### 6.1 Graph view [NICE_TO_HAVE]

**Pre-conditions:** at least two docs cross-link via wikilinks.

WHEN the user opens the graph overlay, the system shall render a force-directed graph (d3-force) with one node per non-`hide_in_graph` doc and edges per wikilink.

#### 6.2 Mobile graph fallback [NICE_TO_HAVE]

**Pre-conditions:** viewport width is below 768px.

WHEN the user opens the graph overlay, the system shall render a text list of nodes and their links instead of the canvas.

## Problem statement

Authors want to publish a notes-and-thinking site as static files,
authored in plain markdown, with cross-links resolved at build time
and no per-page editorial overhead. Existing static-site tools either
require heavy theming work or impose authoring conventions that don't
match a notes workflow. Statix is a deliberately small SPA that takes
a `docs/` tree and renders it with sidebar nav, wikilinks, and a
knowledge-graph view — and not much else.

## User flows

- **Read**: visitor lands on `/`, sees `docs/index.md`, navigates via
  the sidebar or by clicking wikilinks in body content.
- **Author**: contributor adds or edits a markdown file under `docs/`,
  runs `bun run dev`, sees the change reflected, then commits.
- **Deploy**: maintainer pushes to a host that runs the included
  Dockerfile; nginx serves `dist/` on port 8080.

## Content model changes

The full frontmatter contract is documented in `README.md`. No changes
in this retroactive spec.

## Architecture hints

See `CLAUDE.md` for the architectural invariants. Key files:
`scripts/build-content.ts`, `scripts/wikilink-resolver.ts`,
`scripts/markdown-wikilink.ts`, `src/app.tsx`, `src/styles.css`.

## Integrations

- **Vite + Preact** for the SPA shell and dev server.
- **markdown-it** for markdown rendering, with a custom wikilink plugin.
- **d3-force** for the graph layout.
- **highlight.js** for code-block syntax highlighting.
- **nginx + Docker** for production serving.

## Out of scope

- Server-side rendering.
- Multi-tenant publishing.
- Content edited via UI (covered by the CMS feature spec).
