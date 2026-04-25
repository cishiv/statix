---
feature: "<short feature name>"
date_started: "<YYYY-MM-DD>"
template: "statix"
status: "NOT_YET_IMPLEMENTED"
parent_spec: ""
superseded_by: ""
---

# <Feature name>

## ACCEPTANCE_CRITERIA

- [ ] [BLOCKING] <verifiable assertion>
- [ ] [NICE_TO_HAVE] <verifiable assertion>

Each criterion must reduce to one of:
- A command that exits 0 (e.g. `bun run typecheck`, `bun run test`).
- An HTTP request whose response matches a documented Zod schema.

Untagged criteria default to [BLOCKING]. Build and extend agents loop up to 3 attempts per criterion before escalating to the user.

## Problem statement

<Why this feature exists. What user need it serves. 2–3 paragraphs maximum.>

## User flows

<Step-by-step description of how a user interacts with this feature. Reference design assets in `SPECIFICATIONS/DESIGN/DESIGN.md` where applicable.>

## Content model changes

<Frontmatter fields added or modified. Build pipeline changes. New file conventions under `docs/`. If no content-model changes, write "None.">

## Architecture hints

<Suggested file paths, integration usage, suggested patterns. Hints, not prescriptions — the agent has discretion.>

## Out of scope

<Items explicitly deferred. For MVP specs, link to `MVP_{YYYYMMDD}_DEFERRED.md`.>
