# kb

A markdown knowledge base static site generator powered by Vite.

Drop markdown files in a `docs/` directory and get a fully rendered site with sidebar navigation, syntax highlighting, mermaid diagrams, and git-derived metadata.

## Install

```bash
npm install @mattlenz/kb
```

## Usage

Via npm scripts (recommended) in your `package.json`:

```json
{
  "scripts": {
    "docs:dev": "kb dev",
    "docs:build": "kb build"
  }
}
```

Or directly:

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

Frontmatter supports `title`, `description`, `author`, and `children` (for custom ordering).

## Features

- Sidebar navigation with collapsible folders
- Syntax highlighting via Shiki (light/dark themes)
- Mermaid diagram rendering
- Git-derived author, created, and updated dates
- Gravatar avatars from git email
- GFM (tables, strikethrough, autolinks)
- Static build for deployment anywhere
