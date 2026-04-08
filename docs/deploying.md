---
title: Deploying
description: Build for production, subpath deployments, and CI validation.
---

## Building

```bash
kb build                    # outputs to dist/
```

Build validates all internal links automatically. A broken link will produce a non-zero exit code.

## Subpath deployments

For hosting at a subpath (e.g. GitHub Pages project sites at `username.github.io/repo-name/`):

```bash
kb build --base /repo-name
```

## CI

Run validation in CI to catch broken links before deploy:

```bash
kb validate                 # exit code 1 on errors
```

Or rely on `kb build` which validates after generating — a non-zero exit code will fail your pipeline.

### Example workflow

```yaml
# .github/workflows/deploy.yml
steps:
  - uses: actions/checkout@v4
  - run: npm install
  - run: npx kb build --base /repo-name
  - uses: actions/deploy-pages@v4
```
