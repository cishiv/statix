# Statix

A static site generator that turns a directory of Markdown files into a navigable website with sidebar navigation. Built with Preact, Vite, and TypeScript.

## Quick Start

```bash
git clone https://github.com/cishiv/statix.git
cd statix
bun install
```

Add your Markdown files to `docs/`, then:

```bash
bun run dev       # start dev server with hot reload
bun run build     # build static site to dist/
bun run preview   # preview the built site locally
bun run test      # run unit tests
```

## Writing Content

Drop `.md` files into the `docs/` directory. The file structure becomes your site structure:

```
docs/
  index.md                    → /
  getting-started/
    index.md                  → /getting-started
    installation.md           → /getting-started/installation
    configuration.md          → /getting-started/configuration
  guides/
    authentication.md         → /guides/authentication
    deployment.md             → /guides/deployment
```

### Frontmatter

Each file supports optional YAML frontmatter:

```yaml
---
title: Installation        # displayed in sidebar and browser tab (default: filename as Title Case)
order: 1                   # sort position within directory (default: alphabetical)
hidden: false              # if true, accessible via URL but hidden from sidebar
date: 2026-04-01           # original publish date; rendered as a dateline under the H1
updated: 2026-04-13        # optional; shown alongside published date when different
group: guides              # graph node grouping (default: inferred from URL structure)
hide_in_graph: false       # if true, excluded from the knowledge graph
---
```

### Wikilinks

Cross-reference pages using `[[Page Name]]` syntax. Links are resolved by filename, title, or slug (case-insensitive):

```markdown
See [[Installation]] for setup steps.
Read the [[deployment|deploy guide]] for production.
```

Unresolved wikilinks render as broken links and are reported during the build.

## Features

- **Sidebar navigation** — auto-generated from your file tree, up to 3 levels deep
- **Wikilinks** — `[[Page Name]]` syntax resolved at build time; broken links reported to console
- **Knowledge graph** — interactive force-directed graph (d3-force) showing page link topology; text fallback on mobile
- **Backlinks** — each page lists "Referenced by" links automatically derived from wikilinks
- **Syntax highlighting** — code blocks highlighted via highlight.js (JS, TS, Python, Bash, JSON, YAML, CSS, HTML)
- **Inline images** — drop images next to your markdown and reference them with relative paths; synced to `public/_docs/` and watched in dev
- **Published / updated dates** — `date` and `updated` frontmatter render as a dateline beneath the page title
- **Refined typography** — Inter + Roboto Mono, tuned heading rhythm, subtle fade-in on navigation (respects `prefers-reduced-motion`)
- **Light/dark mode** — follows your OS preference via `prefers-color-scheme`
- **Mobile responsive** — hamburger menu with overlay sidebar below 768px
- **Fast builds** — entire site is a client-side SPA with content baked in at build time
- **Hot reload** — markdown and image changes reflect instantly during development

## Customization

Override CSS custom properties to adjust the defaults:

```css
:root {
  --sidebar-width: 240px;
  --content-max-width: 720px;
  --font-body: system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;
  --color-accent: #2563eb;
}
```

## Deploy to Railway

Push to GitHub, connect the repo in Railway, set the port to `8080`. The included `Dockerfile` handles everything:

```dockerfile
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
```

## Project Structure

```
├── src/
│   ├── app.tsx                # root component, routing, layout
│   ├── components/
│   │   ├── Sidebar.tsx        # collapsible nav tree + graph button
│   │   ├── Content.tsx        # rendered markdown display
│   │   ├── GraphOverlay.tsx   # graph modal (canvas on desktop, list on mobile)
│   │   ├── GraphCanvas.tsx    # force-directed graph visualization
│   │   ├── GraphFallback.tsx  # mobile text-based graph list
│   │   └── MobileHeader.tsx   # hamburger menu bar
│   ├── styles.css             # all styles, light/dark mode
│   ├── types.ts               # shared type definitions
│   └── main.tsx               # entry point
├── scripts/
│   ├── build-content.ts       # markdown scanning/parsing/graph pipeline
│   ├── build-content.test.ts  # unit tests
│   ├── markdown-wikilink.ts   # markdown-it wikilink plugin
│   ├── markdown-wikilink.test.ts
│   ├── wikilink-resolver.ts   # wikilink target resolution
│   └── wikilink-resolver.test.ts
├── docs/                      # your markdown content (and co-located images)
├── public/_docs/              # generated: images mirrored from docs/ (gitignored)
├── vite.config.ts             # vite + preact + markdown HMR plugin
├── Dockerfile
└── nginx.conf
```

## License

MIT
