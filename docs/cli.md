---
title: Command Line
description: Command reference for the kb CLI.
---

## Commands

```bash
kb dev                  # Start dev server with live reload
kb build                # Build static site (validates links after)
kb validate             # Check all pages render and links resolve
```

## Options

| Option | Commands | Description |
|--------|----------|-------------|
| `--port <number>` | `dev` | Dev server port (default: 5173) |
| `--base <path>` | `dev`, `build` | Base path for subpath deployments |
| `--content-dir <path>` | `dev`, `build`, `validate` | Override content directory |
| `-h, --help` | all | Show help |
