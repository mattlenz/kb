import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";
import {
  createKb,
  resolveConfig,
  type KbConfig,
  type KnowledgeNode,
} from "../core/index";
import {
  renderPageBody,
  renderLayout,
} from "./templates";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin-owned asset paths
const STYLES_PATH = path.resolve(__dirname, "styles/global.css");
const CLIENT_DIR = path.resolve(__dirname, "client");
const CLIENT_SCRIPTS = ["sidebar.ts", "mermaid.ts", "outline.ts"];

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

interface ContentData {
  tree: KnowledgeNode[];
  rootName: string;
  pages: Map<string, KnowledgeNode>;
}

async function buildContent(
  rootDir: string,
  userConfig?: KbConfig,
): Promise<ContentData> {
  const config = resolveConfig(rootDir, userConfig);
  const kb = createKb(config);

  const tree = kb.getTree();
  const rootMeta = kb.getRootMeta();
  const slugs = [...new Set(kb.getAllSlugs())];
  const pages = new Map<string, KnowledgeNode>();

  for (const slug of slugs) {
    const node = await kb.getNode(slug);
    if (node) pages.set(slug, node);
  }

  return { tree, rootName: rootMeta.name, pages };
}

/** File-extension pattern for knowledge assets */
const ASSET_RE =
  /\.(png|jpe?g|gif|svg|webp|ico|bmp|avif|pdf|mp4|webm|ogg|mp3|wav|woff2?|ttf|eot|zip|tar|gz|csv|xlsx?|docx?|pptx?)$/i;

function renderFullPage(
  data: ContentData,
  slug: string,
  htmlShell: string,
  base = "",
): string {
  const node = data.pages.get(slug);
  if (!node) return "";
  const body = renderPageBody(node, base);
  const layout = renderLayout(data.tree, data.rootName, slug, body, base);
  return htmlShell.replace("<!--kb-content-->", layout);
}

/**
 * Vite plugin for the kb knowledge base system.
 *
 * Vite is used purely as an asset bundler (CSS + client JS).
 * HTML is generated entirely by the plugin — never a Vite entry.
 */
export function kb(userConfig?: KbConfig): Plugin[] {
  let rootDir: string;
  let contentData: ContentData;
  let base = "";

  // Single JS entry that imports CSS and all client scripts.
  // Vite bundles this in library mode → one JS file + one CSS file.
  const entrySource = [
    `import "${STYLES_PATH}";`,
    ...CLIENT_SCRIPTS.map((s) => `import "${path.join(CLIENT_DIR, s)}";`),
  ].join("\n");

  const VIRTUAL_ENTRY = "virtual:kb-entry";
  const RESOLVED_ENTRY = "\0" + VIRTUAL_ENTRY;

  const kbContent: Plugin = {
    name: "kb:content",

    config() {
      const rawBase = userConfig?.base ?? "";
      base = rawBase === "/" ? "" : rawBase.replace(/\/+$/, "");

      return {
        ...(base ? { base: base + "/" } : {}),
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
      contentData = await buildContent(rootDir, userConfig);
      console.log(`[kb] Built ${contentData.pages.size} pages`);
    },

    configureServer(server: ViteDevServer) {
      const config = resolveConfig(rootDir, userConfig);

      // Watch the content directory for changes
      server.watcher.add(config.contentDir);

      let rebuildTimeout: ReturnType<typeof setTimeout> | null = null;
      const rebuild = () => {
        if (rebuildTimeout) clearTimeout(rebuildTimeout);
        rebuildTimeout = setTimeout(async () => {
          console.log("[kb] Content changed, rebuilding...");
          contentData = await buildContent(rootDir, userConfig);
          server.ws.send({ type: "full-reload" });
        }, 200);
      };

      server.watcher.on("change", (file: string) => {
        if (file.startsWith(config.contentDir)) rebuild();
      });
      server.watcher.on("add", (file: string) => {
        if (file.startsWith(config.contentDir)) rebuild();
      });
      server.watcher.on("unlink", (file: string) => {
        if (file.startsWith(config.contentDir)) rebuild();
      });

      // Dev asset references — use /@fs/ prefix for absolute paths outside project root
      const toDevUrl = (absPath: string) => {
        const rel = path.relative(rootDir, absPath);
        return rel.startsWith("..") ? "/@fs" + absPath : "/" + rel;
      };
      const devCssPath = toDevUrl(STYLES_PATH);
      const devScripts = CLIENT_SCRIPTS.map(
        (s) => toDevUrl(path.join(CLIENT_DIR, s)),
      );

      // Dev HTML shell — references source files directly
      const devShell = getHtmlShell({ css: devCssPath, js: devScripts[0] }, base)
        .replace(
          "</body>",
          devScripts.slice(1).map((s) => `    <script type="module" src="${s}"></script>`).join("\n") + "\n  </body>",
        );

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

        // Page routes
        const slug =
          pathname === "/" ? "" : pathname.replace(/\/$/, "").slice(1);

        if (contentData.pages.has(slug)) {
          const transformed = await server.transformIndexHtml(url, devShell);
          const html = renderFullPage(contentData, slug, transformed, base);
          res.setHeader("content-type", "text/html");
          res.end(html);
          return;
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

      // Generate HTML for every page
      for (const [slug] of contentData.pages) {
        const html = renderFullPage(contentData, slug, htmlShell, base);
        const filePath =
          slug === ""
            ? path.join(outDir, "index.html")
            : path.join(outDir, slug, "index.html");
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, html);
      }

      // Copy knowledge assets to output
      const config = resolveConfig(rootDir, userConfig);
      copyAssets(config.contentDir, "", outDir);

      console.log(`[kb] Generated ${contentData.pages.size} static pages`);
    },
  };

  return [kbContent, kbBuild];
}

export default kb;
