---
spec_type: "mvp"
mode: "project"
name: "STATIX"
date_started: "2026-05-01"
template: "statix"
status: "IMPLEMENTED"
parent_spec: "./IMPLEMENTED_DETAILED_STATIX_20260501.md"
---

# Statix — MVP (retroactive)

> Retroactive backfill of the project's MVP slice. The shipped repo
> covers more than this MVP; the additional surface is in
> `./IMPLEMENTED_DETAILED_STATIX_20260501.md`.

## ACCEPTANCE_CRITERIA

### 1. Content pipeline

#### 1.1 Markdown scan [BLOCKING]

**Pre-conditions:** at least one `.md` file exists under `docs/`.

WHEN `bun run build` runs, the system shall walk `docs/` recursively and produce `src/content.json` with one entry per markdown file.

#### 1.2 Frontmatter parsing [BLOCKING]

**Pre-conditions:** a markdown file has YAML frontmatter.

WHEN the build pipeline parses a doc, the system shall extract at minimum `title`, `summary`, `order`, and `hidden`.

#### 1.3 Route derivation [BLOCKING]

**Pre-conditions:** a doc lives at `docs/<dir>/<file>.md`.

WHEN the SPA boots, the system shall serve the doc at `/<dir>/<file>` (or `/` for `docs/index.md`).

### 2. Wikilinks

#### 2.1 Resolution [BLOCKING]

**Pre-conditions:** a doc contains `[[Title]]` whose target exists.

WHEN the build pipeline processes the doc, the system shall rewrite the wikilink to the target route.

#### 2.2 Broken links don't fail the build [BLOCKING]

WHEN a wikilink has no resolution target, the system shall log a warning and continue the build.

### 3. Navigation

#### 3.1 Sidebar from file tree [BLOCKING]

**Pre-conditions:** `src/content.json` is present at runtime.

WHEN the SPA renders, the system shall display a sidebar derived from the doc tree.

### 4. Build & deploy

#### 4.1 Static build [BLOCKING]

WHEN `bun run build` succeeds, the system shall emit a fully static site to `dist/`.

## Problem statement

See `./IMPLEMENTED_DETAILED_STATIX_20260501.md`.

## User flows

See parent spec.

## Content model changes

None at MVP. The full frontmatter shape is in the detailed spec.

## Architecture hints

See `CLAUDE.md`.

## Integrations

- Vite + Preact, markdown-it, nginx + Docker.

## Out of scope

Items below are covered by `./IMPLEMENTED_DETAILED_STATIX_20260501.md`:

- Knowledge graph + mobile fallback.
- Backlinks ("Referenced by") panel.
- Published / updated dates rendered as a dateline.
- Light/dark via `prefers-color-scheme`.
- Reduced-motion handling.
- Mobile hamburger sidebar.
- Syntax highlighting.

A separate `MVP_20260501_DEFERRED.md` is not produced — for this
retroactive backfill the deferred items are tracked in the detailed
spec rather than carried as a parallel backlog.
