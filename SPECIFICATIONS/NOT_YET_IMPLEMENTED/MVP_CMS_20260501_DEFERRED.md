# CMS — Deferred (from MVP)

Items deferred from
`../IMPLEMENTED/IMPLEMENTED_MVP_CMS_20260501.md`. Sourced from
`./DETAILED_CMS_20260501.md`.

This file is a backlog, not a typed spec — no frontmatter on purpose.

## Preview polish

- **Visual fidelity** [USER_VERIFIES]: preview pane should match a
  published page's font, spacing, heading rhythm, and link styling.
  The MVP renders correctly via the shared pipeline but does not
  target pixel-equivalence.

## UX niceties

- **Auto-open browser** when `bun run cms` starts.
- **Tree filter / search** by path or title.

## Authoring

- **Frontmatter form UI**: typed fields per `README.md` instead of
  YAML editing in the body.
- **Image upload**: drag-and-drop into the editor with files written
  next to the doc.

## Git

- **Push / pull / branch** operations.
- **Diff viewer** before stage.

## Larger ideas

- **Body search** across all docs.
- **Multi-user / auth**: would only matter if the CMS ever leaves
  localhost — not planned.
