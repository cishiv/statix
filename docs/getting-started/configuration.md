---
title: Configuration
order: 2
---

# Configuration

## Frontmatter

Each Markdown file supports YAML frontmatter:

```yaml
---
title: My Page Title
order: 1
hidden: false
---
```

### Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `title` | No | Derived from filename | Page title shown in sidebar and browser tab |
| `order` | No | Alphabetical | Sort order within its directory |
| `hidden` | No | `false` | If `true`, page is accessible but hidden from sidebar |

## File Structure

Your `docs/` directory structure becomes your site structure:

```
docs/
  index.md          → /
  getting-started/
    index.md        → /getting-started
    installation.md → /getting-started/installation
```
