import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderMarkdown } from "./parser";
import type {
  DocumentMeta,
  Breadcrumb,
  KnowledgeNode,
  ResolvedKbConfig,
} from "./types";

function nameFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

function readMarkdownFile(
  filePath: string,
): { meta: DocumentMeta; content: string } | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const { children: _, tags: _t, ...meta } = data;
  return { meta: meta as DocumentMeta, content: content.trim() };
}

function readChildrenOrder(dir: string): string[] | null {
  const indexPath = path.join(dir, "index.md");
  if (!fs.existsSync(indexPath)) return null;
  const raw = fs.readFileSync(indexPath, "utf-8");
  const { data } = matter(raw);
  if (Array.isArray(data.children)) return data.children as string[];
  return null;
}

function buildTree(dir: string, slugPrefix: string): KnowledgeNode[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const nodes: KnowledgeNode[] = [];

  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".md") ||
      entry.name === "index.md"
    )
      continue;

    const baseName = entry.name.replace(/\.md$/, "");
    const slug = slugPrefix ? `${slugPrefix}/${baseName}` : baseName;
    const filePath = path.join(dir, entry.name);
    const parsed = readMarkdownFile(filePath);

    if (parsed) {
      const mtime = fs.statSync(filePath).mtimeMs;
      nodes.push({
        slug,
        name: parsed.meta.title || nameFromFilename(entry.name),
        kind: "document",
        meta: parsed.meta,
        _mtime: mtime,
      });
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const slug = slugPrefix ? `${slugPrefix}/${entry.name}` : entry.name;
    const subDir = path.join(dir, entry.name);
    const indexPath = path.join(subDir, "index.md");
    const indexParsed = readMarkdownFile(indexPath);
    const children = buildTree(subDir, slug);
    const mtime = fs.existsSync(indexPath)
      ? fs.statSync(indexPath).mtimeMs
      : 0;

    nodes.push({
      slug,
      name: indexParsed?.meta.title || nameFromFilename(entry.name),
      kind: "folder",
      meta: indexParsed?.meta,
      children,
      _mtime: mtime,
    });
  }

  const order = readChildrenOrder(dir);
  const byMtime = (a: KnowledgeNode, b: KnowledgeNode) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return (b._mtime ?? 0) - (a._mtime ?? 0);
  };

  if (order) {
    const orderMap = new Map(order.map((name, i) => [name, i]));
    return nodes.sort((a, b) => {
      const lastSegment = (slug: string) => slug.split("/").pop()!;
      const aIdx = orderMap.get(lastSegment(a.slug));
      const bIdx = orderMap.get(lastSegment(b.slug));
      if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
      if (aIdx !== undefined) return -1;
      if (bIdx !== undefined) return 1;
      return byMtime(a, b);
    });
  }

  return nodes.sort(byMtime);
}

function buildBreadcrumbs(
  slug: string,
  contentDir: string,
  rootName: string,
): Breadcrumb[] {
  if (!slug) return [];

  const parts = slug.split("/");
  const crumbs: Breadcrumb[] = [{ label: rootName, slug: "" }];

  for (let i = 0; i < parts.length; i++) {
    const ancestorSlug = parts.slice(0, i + 1).join("/");
    const ancestorPath = path.join(contentDir, ...parts.slice(0, i + 1));

    let label = nameFromFilename(parts[i]);

    if (
      fs.existsSync(ancestorPath) &&
      fs.statSync(ancestorPath).isDirectory()
    ) {
      const indexParsed = readMarkdownFile(path.join(ancestorPath, "index.md"));
      if (indexParsed?.meta.title) label = indexParsed.meta.title;
    } else {
      const fileParsed = readMarkdownFile(`${ancestorPath}.md`);
      if (fileParsed?.meta.title) label = fileParsed.meta.title;
    }

    crumbs.push({ label, slug: ancestorSlug });
  }

  return crumbs;
}

/**
 * Create a knowledge base instance bound to a resolved config.
 * All content operations use the configured contentDir and rootDir.
 */
export function createKb(config: ResolvedKbConfig) {
  const { contentDir, title, languages, base } = config;

  function getTree(): KnowledgeNode[] {
    return buildTree(contentDir, "");
  }

  function getRootMeta(): { name: string } {
    const indexParsed = readMarkdownFile(path.join(contentDir, "index.md"));
    return { name: indexParsed?.meta.title || title };
  }

  async function getNode(slug: string): Promise<KnowledgeNode | null> {
    const rootName = getRootMeta().name;

    if (!slug) {
      const indexPath = path.join(contentDir, "index.md");
      const indexParsed = readMarkdownFile(indexPath);
      const rendered = indexParsed?.content
        ? await renderMarkdown(indexParsed.content, "", languages, base)
        : undefined;
      return {
        slug: "",
        name: indexParsed?.meta.title || title,
        kind: "folder",
        meta: indexParsed?.meta,
        content: indexParsed?.content,
        hast: rendered?.hast,
        headings: rendered?.headings,
        children: getTree(),
        breadcrumbs: [],
      };
    }

    const parts = slug.split("/");
    const fullPath = path.join(contentDir, ...parts);
    const breadcrumbs = buildBreadcrumbs(slug, contentDir, rootName);

    if (
      fs.existsSync(fullPath) &&
      fs.statSync(fullPath).isDirectory()
    ) {
      const indexPath = path.join(fullPath, "index.md");
      const indexParsed = readMarkdownFile(indexPath);
      const children = buildTree(fullPath, slug);
      const rendered = indexParsed?.content
        ? await renderMarkdown(indexParsed.content, slug, languages, base)
        : undefined;
      return {
        slug,
        name:
          indexParsed?.meta.title ||
          nameFromFilename(parts[parts.length - 1]),
        kind: "folder",
        meta: indexParsed?.meta,
        content: indexParsed?.content,
        hast: rendered?.hast,
        headings: rendered?.headings,
        children,
        breadcrumbs,
      };
    }

    const mdPath = `${fullPath}.md`;
    if (fs.existsSync(mdPath)) {
      const parsed = readMarkdownFile(mdPath);
      if (!parsed) return null;

      const { hast, headings } = await renderMarkdown(parsed.content, slug, languages, base);
      return {
        slug,
        name:
          parsed.meta.title ||
          nameFromFilename(parts[parts.length - 1]),
        kind: "document",
        meta: parsed.meta,
        content: parsed.content,
        hast,
        headings,
        breadcrumbs,
      };
    }

    return null;
  }

  /** Collect all slugs from the tree. */
  function getAllSlugs(): string[] {
    function collect(nodes: KnowledgeNode[]): string[] {
      const slugs: string[] = [];
      for (const node of nodes) {
        slugs.push(node.slug);
        if (node.children) slugs.push(...collect(node.children));
      }
      return slugs;
    }
    return ["", ...collect(getTree())];
  }

  return { getTree, getRootMeta, getNode, getAllSlugs, config };
}

export type Kb = ReturnType<typeof createKb>;
