#!/usr/bin/env node

/**
 * kb CLI
 *
 * Run a wiki from the current working directory.
 *
 * Usage:
 *   kb dev       Start development server
 *   kb build     Build for production
 *   kb create    Create a new page or section
 *   kb tree      Print content hierarchy
 *   kb validate  Validate wiki content
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createKb, resolveConfig, loadConfigFile, type ResolvedKbConfig } from "../core/index.ts";
import { extractInternalLinks } from "../core/parser.ts";
import { kb as kbPlugin } from "../vite/index.ts";
import type { KnowledgeNode } from "../core/types.ts";

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

function formatDate(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function formatNode(title: string, date: string, description?: string): string {
  const datePart = date ? ` (${date})` : "";
  const descPart = description ? ` — ${description}` : "";
  return `"${title}"${datePart}${descPart}`;
}

function printTree(nodes: KnowledgeNode[], contentDir: string, depth = 0) {
  const indent = "  ".repeat(depth);
  for (const node of nodes) {
    const segments = node.slug.split("/").filter(Boolean);
    const title = node.meta?.title || node.name;
    const dateStr = formatDate(node.meta?.updated_at);
    const desc = node.meta?.description || undefined;

    if (node.kind === "folder") {
      const dirName = segments[segments.length - 1] || path.basename(contentDir);
      console.log(`${indent}${dirName}/`);
      console.log(`${indent}  index.md — ${formatNode(title, dateStr, desc)}`);
      if (node.children) printTree(node.children, contentDir, depth + 1);
    } else {
      const fileName = segments[segments.length - 1] + ".md";
      console.log(`${indent}${fileName} — ${formatNode(title, dateStr, desc)}`);
    }
  }
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
    kb create     Create a new page or section
    kb tree       Print content hierarchy
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

    case "tree": {
      const config = resolveConfig(rootDir, userConfig);

      if (!fs.existsSync(config.contentDir)) {
        console.error(`[kb] Content directory not found: ${config.contentDir}`);
        process.exit(1);
      }

      const kb = createKb(config);
      const tree = kb.getTree();

      // Read root index.md for title + description
      const rootIndexPath = path.join(config.contentDir, "index.md");
      let rootTitle = path.basename(config.contentDir);
      let rootDesc: string | undefined;
      if (fs.existsSync(rootIndexPath)) {
        const matter = (await import("gray-matter")).default;
        const { data } = matter(fs.readFileSync(rootIndexPath, "utf-8"));
        rootTitle = data.title || rootTitle;
        rootDesc = data.description || undefined;
      }

      const rootDirName = path.basename(config.contentDir);
      console.log(`${rootDirName}/`);
      console.log(`  index.md — ${formatNode(rootTitle, "", rootDesc)}`);
      printTree(tree, config.contentDir, 1);
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

    case "create": {
      const target = positionals[1];
      if (!target) {
        console.error("Usage: kb create <path>       (page)");
        console.error("       kb create <path>/      (section)");
        process.exit(1);
      }

      const isSection = target.endsWith("/");
      const config = resolveConfig(rootDir, userConfig);
      const contentDirBase = path.relative(rootDir, config.contentDir);
      // Strip content dir prefix (e.g. "docs/") and .md suffix if provided via tab completion
      const clean = target
        .replace(/\/+$/, "")
        .replace(/\.md$/, "")
        .replace(new RegExp(`^${contentDirBase}\/`), "");
      const fullPath = isSection
        ? path.join(config.contentDir, clean, "index.md")
        : path.join(config.contentDir, clean + ".md");

      if (fs.existsSync(fullPath)) {
        console.error(`[kb] Already exists: ${fullPath}`);
        process.exit(1);
      }

      const slug = clean.split("/").pop() || clean;
      const title = slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const today = new Date().toISOString().slice(0, 10);

      const content = `---\ntitle: "${title}"\ndescription: \ncreated_at: ${today}\nupdated_at: ${today}\n---\n`;

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
      console.log(`[kb] Created ${path.relative(process.cwd(), fullPath)}`);
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
