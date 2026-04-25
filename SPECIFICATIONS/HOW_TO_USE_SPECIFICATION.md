# How to use the SPECIFICATIONS directory

This directory holds the specs that drive feature work in this repo. It is used by both humans and agents.

## For humans

### When to write a spec

Every feature gets a spec before code. Bug fixes and refactors that touch more than 50 lines also get specs.

### Naming

`{FEATURE}_{YYYYMMDD}_SPEC.md`. Use the date the spec was started, not the date of completion. `FEATURE` is uppercase snake_case (e.g. `USER_PROFILE_PAGE`, `STRIPE_INTEGRATION`).

For MVP specs, `FEATURE` is `MVP`. The MVP's deferred-features sibling is `MVP_{YYYYMMDD}_DEFERRED.md`, also placed in `NOT_YET_IMPLEMENTED/`.

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

1. The target template (declared in frontmatter) matches this repo.
2. Required upstream artifacts exist. A `parent_spec` reference in frontmatter must resolve to an existing file.
3. Frontmatter is complete.

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
