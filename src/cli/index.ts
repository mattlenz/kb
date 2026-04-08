#!/usr/bin/env node

/**
 * kb CLI
 *
 * Run a wiki from the current working directory.
 *
 * Usage:
 *   kb dev       Start development server
 *   kb build     Build for production
 *   kb validate  Validate wiki content
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createKb, resolveConfig, loadConfigFile, type ResolvedKbConfig } from "../core/index.ts";
import { extractInternalLinks } from "../core/parser.ts";
import { kb as kbPlugin } from "../vite/index.ts";

async function validateWiki(config: ResolvedKbConfig): Promise<{ totalErrors: number }> {
  const kb = createKb(config);
  const slugs = kb.getAllSlugs();
  const validSlugs = new Set(slugs);
  let renderErrors = 0;
  let linkErrors = 0;

  for (const slug of slugs) {
    try {
      const node = await kb.getNode(slug);
      if (!node) {
        console.error(`  [error] ${slug}: page not found`);
        renderErrors++;
        continue;
      }
      if (!node.hast) continue;

      const links = extractInternalLinks(node.hast, config.base);
      for (const link of links) {
        if (!validSlugs.has(link.slug)) {
          console.error(`  [broken link] ${slug} → ${link.href}`);
          linkErrors++;
        }
      }
    } catch (err) {
      console.error(`  [error] ${slug}: ${err instanceof Error ? err.message : err}`);
      renderErrors++;
    }
  }

  const totalErrors = renderErrors + linkErrors;
  if (totalErrors > 0) {
    console.error(
      `\n[kb] ${totalErrors} error(s)` +
        (linkErrors ? ` (${linkErrors} broken link(s))` : ""),
    );
  } else {
    console.log(`[kb] ${slugs.length} pages validated`);
  }

  return { totalErrors };
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    base: { type: "string" },
    port: { type: "string" },
    "content-dir": { type: "string" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

const command = positionals[0];

function findRepoRoot(from: string): string {
  let dir = from;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, "kb.config.ts")) ||
      fs.existsSync(path.join(dir, "docs"))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return from;
}

function printHelp() {
  console.log(`
  kb - Markdown wiki CLI

  Commands:
    kb dev        Start development server
    kb build      Build for production
    kb validate   Validate wiki content

  Options:
    --base <path>         Base path for deployment (e.g. /repo-name)
    --port <number>       Dev server port (default: 5173)
    --content-dir <path>  Content directory (default: docs or .)
    -h, --help            Show this help message

  Configuration:
    Place a kb.config.ts in your repo root to configure.
  `);
}

async function main() {
  if (!command || values.help) {
    printHelp();
    process.exit(0);
  }

  const cwd = process.cwd();
  const rootDir = findRepoRoot(cwd);

  const fileConfig = await loadConfigFile(rootDir);

  // CLI flags override config file values
  const userConfig = {
    ...fileConfig,
    ...(values.base !== undefined && { base: values.base }),
    ...(values["content-dir"] !== undefined && { contentDir: values["content-dir"] }),
  };

  switch (command) {
    case "dev": {
      console.log(`[kb] Starting dev server from ${rootDir}`);
      const port = values.port ? Number(values.port) : undefined;
      const { createServer } = await import("vite");
      const server = await createServer({
        root: rootDir,
        plugins: [kbPlugin(userConfig)],
        configFile: false,
        ...(port !== undefined && { server: { port } }),
      });
      await server.listen();
      server.printUrls();
      break;
    }

    case "build": {
      console.log(`[kb] Building from ${rootDir}`);
      const { build } = await import("vite");
      await build({
        root: rootDir,
        plugins: [kbPlugin(userConfig)],
        configFile: false,
      });
      // Validate links after build
      const buildConfig = resolveConfig(rootDir, userConfig);
      await validateWiki(buildConfig);
      break;
    }

    case "validate": {
      const config = resolveConfig(rootDir, userConfig);

      if (!fs.existsSync(config.contentDir)) {
        console.error(`[kb] Content directory not found: ${config.contentDir}`);
        process.exit(1);
      }

      const { totalErrors } = await validateWiki(config);
      if (totalErrors > 0) process.exit(1);
      break;
    }

    default:
      console.error(`[kb] Unknown command: ${command}`);
      console.error('  Run "kb --help" for available commands');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
