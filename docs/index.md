---
title: kb
description: A markdown wiki static site generator powered by Vite.
children:
  - concepts
  - markdown-guide
  - fonts
---

Drop markdown files in a directory and get a fully rendered site with sidebar navigation, syntax highlighting, and mermaid diagrams.

## Quick start

```bash
mkdir kb-example
cd kb-example
echo "# Hello" > index.md
npx github:mattlenz/kb dev
# → http://localhost:5173
```

## Install

```bash
npm install github:mattlenz/kb
```

## Usage

```bash
npx kb dev       # Start dev server
npx kb build     # Build static site to dist/
npx kb validate  # Validate all pages
```

## Configuration

Create a `kb.config.ts` in your repo root:

```ts
import { defineConfig } from "@mattlenz/kb";

export default defineConfig({
  title: "My Wiki",
  contentDir: "docs", // defaults to "docs" if it exists, otherwise "."
  base: "/kb", // base path for subpath deployments
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

Use `--base` when deploying to a subpath:

```bash
npx kb build --base /kb
```

### GitHub Pages

For project sites served at `username.github.io/repo-name/`, pass `--base` in your build step and use the `actions/deploy-pages` workflow to publish the `dist/` output.

## Features

- Sidebar navigation with collapsible folders
- Syntax highlighting via [Shiki](https://shiki.style) (light/dark themes)
- [Mermaid](https://mermaid.js.org) diagram rendering
- [GitHub Flavored Markdown](https://github.github.com/gfm/) (tables, strikethrough, autolinks)
- Static build for deployment anywhere
