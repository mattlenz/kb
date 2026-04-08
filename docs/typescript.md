---
title: TypeScript
description: Using kb as a library in your own code.
---

## Core library

The core library is available as `@mattlenz/kb`:

```typescript
import { createKb, resolveConfig } from "@mattlenz/kb";

const config = resolveConfig(process.cwd());
const kb = createKb(config);

// Get the full tree
const tree = kb.getTree();

// Get a single page with rendered content
const node = await kb.getNode("/guides/deployment");
console.log(node?.hast);        // HAST (HTML AST)
console.log(node?.headings);    // Extracted headings
console.log(node?.breadcrumbs); // Navigation breadcrumbs
```

## Vite plugin

The Vite plugin is available as `@mattlenz/kb/vite`:

```typescript
import { kb } from "@mattlenz/kb/vite";

export default {
  plugins: [kb({ title: "My Wiki" })],
};
```

This is what the CLI uses internally — useful if you want to embed kb into a larger Vite project.
