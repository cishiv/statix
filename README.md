# Statix

A static site generator that turns a directory of Markdown files into a navigable website with sidebar navigation. Built with Preact, Vite, and TypeScript.

## Quick Start

```bash
git clone https://github.com/your-username/statix.git
cd statix
nvm use 20
npm install
```

Add your Markdown files to `docs/`, then:

```bash
npm run dev       # start dev server with hot reload
npm run build     # build static site to dist/
npm run preview   # preview the built site locally
npm run test      # run unit tests
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
---
```

## Features

- **Sidebar navigation** — auto-generated from your file tree, up to 3 levels deep
- **Syntax highlighting** — code blocks highlighted via highlight.js (JS, TS, Python, Bash, JSON, YAML, CSS, HTML)
- **Light/dark mode** — follows your OS preference via `prefers-color-scheme`
- **Mobile responsive** — hamburger menu with overlay sidebar below 768px
- **Fast builds** — entire site is a client-side SPA with content baked in at build time
- **Hot reload** — markdown changes reflect instantly during development

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
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

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
│   │   ├── Sidebar.tsx        # collapsible nav tree
│   │   ├── Content.tsx        # rendered markdown display
│   │   └── MobileHeader.tsx   # hamburger menu bar
│   ├── styles.css             # all styles, light/dark mode
│   ├── types.ts               # shared type definitions
│   └── main.tsx               # entry point
├── scripts/
│   ├── build-content.ts       # markdown scanning/parsing pipeline
│   └── build-content.test.ts  # unit tests
├── docs/                      # your markdown content
├── vite.config.ts             # vite + preact + markdown HMR plugin
├── Dockerfile
└── nginx.conf
```

## License

MIT
