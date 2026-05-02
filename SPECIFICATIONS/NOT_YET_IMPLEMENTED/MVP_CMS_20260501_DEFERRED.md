# CMS — Deferred (from MVP)

Items deferred from
`../IMPLEMENTED/IMPLEMENTED_MVP_CMS_20260501.md`. Sourced from
`./DETAILED_CMS_20260501.md`.

This file is a backlog, not a typed spec — no frontmatter on purpose.

## Shipped after the MVP (kept here for traceability)

Two batches of deferred items have landed on `main`:

- Batch 1 (PR #3, merged 2026-05-02): auto-open browser on
  `bun run cms`, tree filter / search by title and path,
  syntax-highlighting stylesheet for the preview pane.
- Batch 2 (commits direct to `main`, 2026-05-02): drag-and-drop image
  upload, `git push` endpoint + button, body search across all docs
  (merged into the existing tree filter with snippet display).

## Still deferred

### Authoring

- **Frontmatter form UI**: typed fields per `README.md` instead of
  YAML editing in the body.

### Git

- **Pull / fetch / branch** operations. Push shipped in batch 2;
  the rest of the git surface beyond commit + push is still manual.
- **Diff viewer** before stage.

### Preview polish

- **Visual fidelity** [USER_VERIFIES]: preview pane should match a
  published page's font, spacing, heading rhythm, and link styling.
  Batch 1 added syntax highlighting for code blocks; the rest of the
  visual parity work is still TODO.

### Larger ideas

- **Multi-user / auth**: would only matter if the CMS ever leaves
  localhost — not planned.
