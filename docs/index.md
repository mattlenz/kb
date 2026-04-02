---
title: kb
description: A markdown knowledge base static site generator powered by Vite.
---

Drop markdown files in a `docs/` directory and get a fully rendered site with sidebar navigation, syntax highlighting, and mermaid diagrams.

## Install

```bash
npm install @mattlenz/kb
```

## Usage

```bash
kb dev       # Start dev server
kb build     # Build static site to dist/
kb validate  # Validate all pages
```

## Configuration

Create a `kb.config.ts` in your repo root:

```ts
import { defineConfig } from "@mattlenz/kb";

export default defineConfig({
  title: "My Knowledge Base",
  contentDir: "docs",
});
```

## Content structure

```
docs/
  index.md          # Root page
  getting-started.md
  guides/
    index.md        # Section page
    deployment.md
```

Frontmatter supports `title`, `description`, and `children` (for custom ordering).

## Deployment

Set the `base` option when deploying to a subpath:

```ts
export default defineConfig({
  base: "/repo-name",
});
```

### GitHub Pages

For project sites served at `username.github.io/repo-name/`, set `base` to your repo name and use the `actions/deploy-pages` workflow to publish the `dist/` output.

## Features

- Sidebar navigation with collapsible folders
- Syntax highlighting via [Shiki](https://shiki.style) (light/dark themes)
- [Mermaid](https://mermaid.js.org) diagram rendering
- [GitHub Flavored Markdown](https://github.github.com/gfm/) (tables, strikethrough, autolinks)
- Static build for deployment anywhere
