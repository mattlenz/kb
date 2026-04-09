---
title: Command Line
description: CLI commands and options.
---

## Commands

```bash
kb dev                  # Start dev server with live reload
kb build                # Build static site (validates links after)
kb create <path>        # Create a new page (trailing / for section)
kb tree                 # Print content hierarchy with titles and dates
kb validate             # Check all pages render and links resolve
```

## Options

| Option | Commands | Description |
|--------|----------|-------------|
| `--port <number>` | `dev` | Dev server port (default: 5173) |
| `--base <path>` | `dev`, `build` | Base path for subpath deployments |
| `--content-dir <path>` | `dev`, `build`, `tree`, `validate` | Override content directory |
| `-h, --help` | all | Show help |
