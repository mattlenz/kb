---
title: kb
description: Turn a folder of markdown files into a wiki with live reload and static export.
children:
  - guide
  - configuration
  - command-line
  - deploying
  - typescript
  - formatting
  - font-license
  - drafts
---

## Quick start

```bash
mkdir my-wiki && cd my-wiki
echo "# Hello" > index.md
npx github:mattlenz/kb dev
# → http://localhost:5173
```

No config needed. Add a `kb.config.ts` when you want to customize — see [[configuration]].

## Install

```bash
npm install github:mattlenz/kb
```

Then add scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "kb dev",
    "build": "kb build"
  }
}
```

## Features

- Sidebar navigation from your file structure
- Syntax highlighting with light/dark themes
- Mermaid and PlantUML diagram rendering
- GitHub Flavored Markdown (tables, task lists, strikethrough)
- Wiki links — `[[page]]` and `[[page|display text]]`
- Relative links — `./page.md` resolves correctly
- Broken link detection on build
- Static output for deployment anywhere
