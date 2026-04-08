# kb

A markdown wiki static site generator powered by Vite.

Drop markdown files in a directory and get a fully rendered site with sidebar navigation, syntax highlighting, and mermaid diagrams.

| Light | Dark |
|-------|------|
| ![Light mode](screenshots/light.png) | ![Dark mode](screenshots/dark.png) |

## Quick start

```bash
mkdir my-wiki && cd my-wiki
echo "# Hello" > index.md
npx github:mattlenz/kb dev
# → http://localhost:5173
```

## Install

```bash
npm install github:mattlenz/kb
```

## Features

- Sidebar navigation from your file structure
- Syntax highlighting with light/dark themes
- Mermaid diagram rendering
- GitHub Flavored Markdown (tables, task lists, strikethrough)
- Wiki links — `[[page]]` and `[[page|display text]]`
- Relative links — `./page.md` resolves correctly
- Broken link detection on build
- Static output for deployment anywhere

## Documentation

Run `kb dev` in this repo to browse the full docs, or see [docs/concepts.md](docs/concepts.md) for how content is organized, linked, and deployed.
