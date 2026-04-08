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
import { createKb, resolveConfig, loadConfigFile } from "../core/index.ts";
import { kb as kbPlugin } from "../vite/index.ts";

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
      break;
    }

    case "validate": {
      console.log(`[kb] Validating wiki at ${rootDir}`);
      const config = resolveConfig(rootDir, userConfig);
      const kb = createKb(config);

      if (!fs.existsSync(config.contentDir)) {
        console.error(
          `[kb] Content directory not found: ${config.contentDir}`,
        );
        process.exit(1);
      }

      const slugs = kb.getAllSlugs();
      let errors = 0;

      for (const slug of slugs) {
        try {
          const node = await kb.getNode(slug);
          if (!node) {
            console.error(`  [error] ${slug || "(root)"}: node not found`);
            errors++;
          } else {
            console.log(`  [ok] ${slug || "(root)"}`);
          }
        } catch (err) {
          console.error(
            `  [error] ${slug || "(root)"}: ${err instanceof Error ? err.message : err}`,
          );
          errors++;
        }
      }

      if (errors > 0) {
        console.error(`\n[kb] Validation failed with ${errors} error(s)`);
        process.exit(1);
      }

      console.log(`\n[kb] All ${slugs.length} pages validated successfully`);
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
