# How to use the SPECIFICATIONS directory

This directory holds the specs that drive feature work in this repo. It is used by both humans and agents.

## For humans

### When to write a spec

Every feature gets a spec before code. Bug fixes and refactors that touch more than 50 lines also get specs.

### Modes and naming

This repo's specs follow one of two modalities. Filename + frontmatter together identify which mode a spec belongs to.

**Project mode** — the first detailed spec and MVP spec for the repo. There is exactly one of each per project.

- Detailed: `DETAILED_{PROJECT_NAME}_{YYYYMMDD}.md`
- MVP: `MVP_{YYYYMMDD}_SPEC.md`

**Feature mode** — specs added incrementally to an existing repo. Multiple of each can exist over time.

- Detailed (per feature): `DETAILED_{FEATURE_NAME}_{YYYYMMDD}.md`
- MVP (per feature): `MVP_{FEATURE_NAME}_{YYYYMMDD}.md`

`PROJECT_NAME` and `FEATURE_NAME` are uppercase snake_case. Use the date the spec was started, not the date of completion.

Out-of-MVP items from a project MVP go into a sibling file `MVP_{YYYYMMDD}_DEFERRED.md`. Out-of-MVP items from a feature MVP go into `MVP_{FEATURE_NAME}_{YYYYMMDD}_DEFERRED.md`.

### Lifecycle

There are two states: `NOT_YET_IMPLEMENTED` and `IMPLEMENTED`. The lifecycle:

1. Spec is written. The file lives in `NOT_YET_IMPLEMENTED/`.
2. Implementation is committed.
3. In a separate commit, the file is moved to `IMPLEMENTED/` and renamed with an `IMPLEMENTED_` prefix. Example: `MVP_20260425_SPEC.md` becomes `IMPLEMENTED/IMPLEMENTED_MVP_20260425_SPEC.md`.

The folder change marks state. The filename prefix makes the state visible in grep output and file lists.

### Cross-references

Use relative paths, not wikilinks. GitHub renders relative paths; wikilinks do not render on GitHub and behave inconsistently across editors.

```
See [auth flow](../IMPLEMENTED/IMPLEMENTED_AUTH_20260301_SPEC.md).
```

### Design references

Visual design references live in `SPECIFICATIONS/DESIGN/`:

- `DESIGN.md` indexes references and adds prose context.
- Visual files (images, exports from claude.design) sit alongside.

Specs reference the design via relative path.

## For agents

### Validation before generating a spec

Before writing a spec, validate:

1. The target template (declared in frontmatter `template`) matches this repo.
2. `spec_type` and `mode` are populated.
3. `name` matches the filename.
4. `parent_spec`:
   - Project-mode detailed specs (`spec_type: detailed`, `mode: project`): must be empty.
   - All other spec types: must point at an existing file. The path is relative to the spec being written.
5. Frontmatter is complete YAML.
6. No filename collision in the target directory.

The mode/parent_spec relationship:

| spec_type | mode    | parent_spec target                                          |
|-----------|---------|-------------------------------------------------------------|
| detailed  | project | empty                                                       |
| mvp       | project | `../NOT_YET_IMPLEMENTED/DETAILED_{PROJECT_NAME}_{...}.md`   |
| detailed  | feature | `../IMPLEMENTED/IMPLEMENTED_MVP_{...}_SPEC.md`              |
| mvp       | feature | `../NOT_YET_IMPLEMENTED/DETAILED_{FEATURE_NAME}_{...}.md`   |

A mismatch between filename, `mode`, and `parent_spec` is a hard error. Refuse to write and surface the issue.

### Validation before implementing from a spec

Before implementing:

1. The `ACCEPTANCE_CRITERIA` section is present and every criterion is verifiable (reduces to command-exit-0 or HTTP+Zod).
2. Architecture hints don't conflict with `CLAUDE.md` principles.
3. The `Integrations` section is filled in.

### What to update on commit

When a spec is implemented:

1. Move the spec from `NOT_YET_IMPLEMENTED/` to `IMPLEMENTED/` with `IMPLEMENTED_` prefix in a separate commit (after the implementation commit).
2. Update the agent-writable section of `CLAUDE.md` (below the `<!-- AGENT-WRITABLE BELOW -->` divider) if file map, recipes, or golden paths changed.
3. Update `README.md` only if the public surface changed (new endpoints, new env vars, new scripts) or deployment shape changed.

### Surfacing issues

If a spec is missing required sections, has unverifiable criteria, contains TODO markers, or has unfilled `Integrations`, do not implement. Surface the issues to the user.
