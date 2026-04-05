import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";
import {
  createKb,
  resolveConfig,
  type KbConfig,
  type KnowledgeNode,
} from "../core/index";
import { renderPage, toTreeNodes, toPageData } from "./render";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin-owned asset paths
const ENTRY_PATH = path.resolve(__dirname, "client/entry.tsx");

/**
 * Generate the HTML shell with references to bundled assets.
 * In dev, paths point to source files served by Vite.
 * In build, paths are replaced with the bundled asset filenames.
 */
function getHtmlShell(assetRefs: { css: string; js: string }, base = ""): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />${base ? `\n    <meta name="kb-base" content="${base}" />` : ""}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${assetRefs.css}" />
  </head>
  <body>
    <!--kb-content-->
    <script type="application/json" id="kb-data"><!--kb-data--></script>
    <script type="module" src="${assetRefs.js}"></script>
  </body>
</html>`;
}

/** Copy non-markdown files from contentDir to destDir, preserving structure. */
function copyAssets(dir: string, relativeDir: string, destDir: string) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      copyAssets(path.join(dir, entry.name), relativePath, destDir);
    } else if (!entry.name.endsWith(".md")) {
      const dest = path.join(destDir, relativePath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(dir, entry.name), dest);
    }
  }
}

interface TreeData {
  tree: KnowledgeNode[];
  rootName: string;
  slugs: Set<string>;
}

function buildTreeData(
  rootDir: string,
  userConfig?: KbConfig,
): TreeData {
  const config = resolveConfig(rootDir, userConfig);
  const kb = createKb(config);

  const tree = kb.getTree();
  const rootMeta = kb.getRootMeta();
  const slugs = new Set(kb.getAllSlugs());

  return { tree, rootName: rootMeta.name, slugs };
}

/**
 * Map a filesystem path back to a content slug for cache invalidation.
 * Returns null if the path is not inside contentDir.
 */
function fileToSlug(filePath: string, contentDir: string): string | null {
  if (!filePath.startsWith(contentDir)) return null;
  let rel = filePath.slice(contentDir.length).replace(/^\/+/, "");
  // index.md → parent folder slug
  if (rel === "index.md") return "";
  if (rel.endsWith("/index.md")) rel = rel.slice(0, -"/index.md".length);
  else if (rel.endsWith(".md")) rel = rel.slice(0, -".md".length);
  else return null; // non-markdown file
  return rel;
}

/** File-extension pattern for knowledge assets */
const ASSET_RE =
  /\.(png|jpe?g|gif|svg|webp|ico|bmp|avif|pdf|mp4|webm|ogg|mp3|wav|woff2?|ttf|eot|zip|tar|gz|csv|xlsx?|docx?|pptx?)$/i;

function renderFullPage(
  treeData: TreeData,
  node: KnowledgeNode,
  htmlShell: string,
  basePath = "",
): string {
  const { html, initialData } = renderPage(treeData, node, basePath);
  return htmlShell
    .replace("<!--kb-content-->", html)
    .replace("<!--kb-data-->", JSON.stringify(initialData));
}

/**
 * Vite plugin for the kb knowledge base system.
 *
 * Vite is used purely as an asset bundler (CSS + client JS).
 * HTML is generated entirely by the plugin — never a Vite entry.
 */
export function kb(userConfig?: KbConfig): Plugin[] {
  let rootDir: string;
  let treeData: TreeData;
  let base = "";
  /** On-demand page cache — populated by middleware, invalidated by watcher. */
  const pageCache = new Map<string, KnowledgeNode>();

  // Single JS entry that imports the Preact client app (CSS + components).
  const entrySource = `import "${ENTRY_PATH}";`;

  const VIRTUAL_ENTRY = "virtual:kb-entry";
  const RESOLVED_ENTRY = "\0" + VIRTUAL_ENTRY;

  const kbContent: Plugin = {
    name: "kb:content",

    config() {
      const rawBase = userConfig?.base ?? "";
      base = rawBase === "/" ? "" : rawBase.replace(/\/+$/, "");

      return {
        ...(base ? { base: base + "/" } : {}),
        // Keep Vite's cache out of the user's project directory
        cacheDir: path.join(os.tmpdir(), "kb-vite-" + crypto.createHash("md5").update(process.cwd()).digest("hex").slice(0, 8)),
        // Build the virtual entry in library mode — produces bundled CSS + JS
        build: {
          rollupOptions: {
            input: VIRTUAL_ENTRY,
          },
          cssCodeSplit: false,
        },
        // Allow Vite to serve files from the plugin's package directory
        server: {
          fs: {
            allow: [path.resolve(__dirname, "..")],
          },
        },
        // Disable default index.html handling
        appType: "custom" as const,
      };
    },

    configResolved(config) {
      rootDir = config.root;
    },

    resolveId(id) {
      if (id === VIRTUAL_ENTRY) return RESOLVED_ENTRY;
    },

    load(id) {
      if (id === RESOLVED_ENTRY) return entrySource;
    },

    async buildStart() {
      console.log("[kb] Building knowledge base...");
      treeData = buildTreeData(rootDir, userConfig);
      console.log(`[kb] Found ${treeData.slugs.size} pages`);
    },

    configureServer(server: ViteDevServer) {
      const config = resolveConfig(rootDir, userConfig);
      const kb = createKb(config);

      // Watch the content directory for changes
      server.watcher.add(config.contentDir);

      // --- Debounced handlers ---
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let pendingInvalidations: { type: "change" | "structure"; file: string }[] = [];

      const flush = () => {
        const batch = pendingInvalidations;
        pendingInvalidations = [];

        const hasStructuralChange = batch.some((e) => e.type === "structure");

        // Always rebuild tree (cheap fs scan) — titles may have changed
        treeData = buildTreeData(rootDir, userConfig);
        server.ws.send({
          type: "custom",
          event: "kb:tree-update",
          data: { tree: toTreeNodes(treeData.tree), rootName: treeData.rootName },
        });

        if (hasStructuralChange) {
          // add/unlink: clear entire page cache
          pageCache.clear();
        } else {
          // content-only changes: invalidate and push updated page data
          for (const event of batch) {
            const slug = fileToSlug(event.file, config.contentDir);
            if (slug !== null) {
              pageCache.delete(slug);
              console.log(`[kb] Invalidated: ${slug || "(root)"}`);
              // Re-render and push to client
              kb.getNode(slug).then((node) => {
                if (node) {
                  pageCache.set(slug, node);
                  server.ws.send({
                    type: "custom",
                    event: "kb:page-update",
                    data: { slug, pageData: toPageData(node) },
                  });
                }
              });
            }
          }
        }
      };

      const scheduleFlush = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flush, 200);
      };

      server.watcher.on("change", (file: string) => {
        if (!file.startsWith(config.contentDir)) return;
        pendingInvalidations.push({ type: "change", file });
        scheduleFlush();
      });
      server.watcher.on("add", (file: string) => {
        if (!file.startsWith(config.contentDir)) return;
        pendingInvalidations.push({ type: "structure", file });
        scheduleFlush();
      });
      server.watcher.on("unlink", (file: string) => {
        if (!file.startsWith(config.contentDir)) return;
        pendingInvalidations.push({ type: "structure", file });
        scheduleFlush();
      });

      // Dev asset references — use /@fs/ prefix for absolute paths outside project root
      const toDevUrl = (absPath: string) => {
        const rel = path.relative(rootDir, absPath);
        return rel.startsWith("..") ? "/@fs" + absPath : "/" + rel;
      };
      const devEntryUrl = toDevUrl(ENTRY_PATH);

      // Dev HTML shell — single entry point for Preact app
      const devShell = getHtmlShell({ css: "", js: devEntryUrl }, base);

      // Serve pages via middleware
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "/";
        const rawPathname = new URL(url, "http://localhost").pathname;

        // Skip Vite internals
        if (
          rawPathname.startsWith("/@") ||
          rawPathname.startsWith("/node_modules")
        ) {
          return next();
        }

        // Strip base prefix for routing
        const pathname = base && rawPathname.startsWith(base)
          ? rawPathname.slice(base.length) || "/"
          : rawPathname;

        // Serve content assets directly from the content directory
        if (ASSET_RE.test(pathname)) {
          const assetPath = path.join(config.contentDir, pathname.slice(1));
          if (fs.existsSync(assetPath)) {
            return res.end(fs.readFileSync(assetPath));
          }
          return next();
        }

        // JSON API for client-side navigation
        if (pathname.startsWith("/__kb_api/")) {
          const apiSlug = pathname.slice("/__kb_api/".length).replace(/\.json$/, "");
          const resolvedSlug = apiSlug === "_index" ? "" : apiSlug;

          if (treeData.slugs.has(resolvedSlug)) {
            let node = pageCache.get(resolvedSlug);
            if (!node) {
              node = await kb.getNode(resolvedSlug) ?? undefined;
              if (node) pageCache.set(resolvedSlug, node);
            }
            if (node) {
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify(toPageData(node)));
              return;
            }
          }
          res.statusCode = 404;
          res.end("{}");
          return;
        }

        // Page routes
        const slug =
          pathname === "/" ? "" : pathname.replace(/\/$/, "").slice(1);

        if (treeData.slugs.has(slug)) {
          // On-demand rendering with cache
          let node = pageCache.get(slug);
          if (!node) {
            node = await kb.getNode(slug) ?? undefined;
            if (node) pageCache.set(slug, node);
          }
          if (node) {
            const transformed = await server.transformIndexHtml(url, devShell);
            const html = renderFullPage(treeData, node, transformed, base);
            res.setHeader("content-type", "text/html");
            res.end(html);
            return;
          }
        }

        next();
      });
    },
  };

  const kbBuild: Plugin = {
    name: "kb:build",
    apply: "build",

    async writeBundle(options, bundle) {
      const outDir = options.dir ?? path.join(rootDir, "dist");

      // Find the bundled CSS and JS filenames from the output
      let cssFile = "";
      let jsFile = "";
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith(".css")) cssFile = base + "/" + fileName;
        if (fileName.endsWith(".js") && "isEntry" in chunk && chunk.isEntry) {
          jsFile = base + "/" + fileName;
        }
      }

      // Generate the HTML shell with bundled asset references
      const htmlShell = getHtmlShell({ css: cssFile, js: jsFile }, base);

      // Build renders all pages eagerly for static output
      const buildConfig = resolveConfig(rootDir, userConfig);
      const buildKb = createKb(buildConfig);
      let pageCount = 0;

      for (const slug of treeData.slugs) {
        const node = await buildKb.getNode(slug);
        if (!node) continue;
        const html = renderFullPage(treeData, node, htmlShell, base);
        const filePath =
          slug === ""
            ? path.join(outDir, "index.html")
            : path.join(outDir, slug, "index.html");
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, html);
        pageCount++;
      }

      // Copy knowledge assets to output
      copyAssets(buildConfig.contentDir, "", outDir);

      console.log(`[kb] Generated ${pageCount} static pages`);
    },
  };

  return [kbContent, kbBuild];
}

export default kb;
