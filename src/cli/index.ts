#!/usr/bin/env tsx

/**
 * kb CLI
 *
 * Run a knowledge base from the current working directory.
 *
 * Usage:
 *   kb dev       Start development server
 *   kb build     Build for production
 *   kb validate  Validate knowledge base content
 */

import fs from "node:fs";
import path from "node:path";
import { createKb, resolveConfig, loadConfigFile } from "../core/index";
import { kb as kbPlugin } from "../vite/index";

const args = process.argv.slice(2);
const command = args[0];

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

async function main() {
  const cwd = process.cwd();
  const rootDir = findRepoRoot(cwd);

  if (!command || command === "help" || command === "--help") {
    console.log(`
  kb - Knowledge base CLI

  Commands:
    kb dev        Start development server
    kb build      Build for production
    kb validate   Validate knowledge base content

  Options:
    --help        Show this help message

  Configuration:
    Place a kb.config.ts in your repo root to configure.
    `);
    process.exit(0);
  }

  const userConfig = await loadConfigFile(rootDir);

  switch (command) {
    case "dev": {
      console.log(`[kb] Starting dev server from ${rootDir}`);
      const { createServer } = await import("vite");
      const server = await createServer({
        root: rootDir,
        plugins: [kbPlugin(userConfig)],
        configFile: false,
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
      console.log(`[kb] Validating knowledge base at ${rootDir}`);
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
      console.error('  Run "kb help" for available commands');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
