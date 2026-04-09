---
title: kb
description: A markdown knowledge base — directories are sections, files are pages.
children:
  - guide
  - formatting
  - command-line
  - configuration
  - deploying
  - typescript
  - font-license
  - ideas
---

A markdown knowledge base. Directories are sections, markdown files are pages. No database, no CMS — edit text files, get a site.

```bash
mkdir docs && echo "# Hello" > docs/index.md
kb dev
# → http://localhost:5173
```

Read the [[guide]] for how it all works — structure, pages, links, formatting, and tools.

## Features

- Sidebar navigation from your file structure
- Syntax highlighting with light/dark themes
- Mermaid and PlantUML diagrams
- GitHub Flavored Markdown (tables, task lists, footnotes)
- Wiki links — `[[page]]` and `[[page|display text]]`
- Broken link detection on build
- Static output for deployment anywhere
