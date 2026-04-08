---
title: Configuration
description: All kb.config.ts options.
---

Create a `kb.config.ts` in your repo root. All fields are optional:

```typescript
import { defineConfig } from "@mattlenz/kb";

export default defineConfig({
  // Site title — sidebar root and <title> tag.
  // Default: "Wiki"
  title: "My Wiki",

  // Content directory, relative to repo root.
  // Default: "docs" if it exists, otherwise "."
  contentDir: "docs",

  // Base path for subpath deployments.
  // Default: ""
  base: "/my-repo",

  // Additional Shiki languages for syntax highlighting.
  // Common languages are included by default.
  languages: ["ruby", "elixir", "hcl"],
});
```

## Default languages

Syntax highlighting is included for: TypeScript, JavaScript, TSX, JSX, JSON, Bash, Shell, YAML, Markdown, CSS, HTML, Python, Go, Rust, Swift, SQL, GraphQL, Diff, and TOML.

Add more via the `languages` config. Any [Shiki language](https://shiki.style/languages) is supported.
