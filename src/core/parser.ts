import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkHeadingId from "remark-heading-id";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeShiki, { type RehypeShikiOptions } from "@shikijs/rehype";
import { toString } from "hast-util-to-string";
import type { Element, Root } from "hast";
import type { Root as MdastRoot, PhrasingContent } from "mdast";
import { visit, SKIP } from "unist-util-visit";
import type { Heading } from "./types.ts";

// ---------------------------------------------------------------------------
// Remark plugins
// ---------------------------------------------------------------------------

/**
 * Convert `[[slug]]` and `[[slug|text]]` wiki-link syntax into standard
 * markdown link nodes so they flow through the same URL resolution as
 * every other internal link.
 */
function remarkWikiLinks() {
  return (tree: MdastRoot) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === undefined) return;

      const wikiLinkRe = /\[\[([^\]]+)\]\]/g;
      if (!wikiLinkRe.test(node.value)) return;
      wikiLinkRe.lastIndex = 0;

      const newNodes: PhrasingContent[] = [];
      let last = 0;
      let match: RegExpExecArray | null;

      while ((match = wikiLinkRe.exec(node.value)) !== null) {
        if (match.index > last) {
          newNodes.push({ type: "text", value: node.value.slice(last, match.index) });
        }

        const raw = match[1];
        const pipe = raw.indexOf("|");
        const slug = (pipe >= 0 ? raw.slice(0, pipe) : raw).trim();
        const text = (pipe >= 0 ? raw.slice(pipe + 1) : slug).trim();

        newNodes.push({
          type: "link",
          url: `/${slug}`,
          children: [{ type: "text", value: text }],
        });

        last = match.index + match[0].length;
      }

      if (last < node.value.length) {
        newNodes.push({ type: "text", value: node.value.slice(last) });
      }

      (parent.children as PhrasingContent[]).splice(index, 1, ...newNodes);
      return [SKIP, index + newNodes.length];
    });
  };
}

// ---------------------------------------------------------------------------
// Rehype plugins
// ---------------------------------------------------------------------------

/**
 * Replace mermaid code blocks with `<kb-mermaid chart="...">` custom elements
 * before Shiki tries to highlight them.
 */
function rehypeMermaid() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (
        node.tagName !== "pre" ||
        !parent ||
        index === undefined
      ) return;

      const code = node.children[0];
      if (
        !code ||
        code.type !== "element" ||
        code.tagName !== "code"
      ) return;

      const className = (code.properties?.className as string[]) ?? [];
      if (!className.includes("language-mermaid")) return;

      const raw = code.children
        .filter((c): c is { type: "text"; value: string } => c.type === "text")
        .map((c) => c.value)
        .join("");

      (parent.children as Element[])[index] = {
        type: "element",
        tagName: "kb-mermaid",
        properties: { chart: raw },
        children: [],
      };
    });
  };
}

/** Strip `background-color` and `font-family` from inline styles (shiki adds these). */
function rehypeStripShikiBg() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (typeof node.properties.style === "string") {
        const cleaned = node.properties.style
          .replace(/background-color:[^;"]+;?/g, "")
          .replace(/font-family:[^;"]+;?/g, "")
          .trim();
        node.properties.style = cleaned || undefined;
      }
    });
  };
}

/** Wrap `<table>` elements in a scrollable `<div class="table-wrapper">`. */
function rehypeTableWrap() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "table" || !parent || index === undefined) return;
      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrapper"] },
        children: [node],
      };
      (parent.children as Element[])[index] = wrapper;
    });
  };
}

/** Convert standalone `<p><img alt="..."></p>` into `<figure><img><figcaption>`. */
function rehypeFigure() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "p" || !parent || index === undefined) return;
      const meaningful = node.children.filter(
        (c) => !(c.type === "text" && !c.value.trim()),
      );
      if (meaningful.length !== 1) return;
      const img = meaningful[0];
      if (img.type !== "element" || img.tagName !== "img") return;
      const alt = img.properties.alt as string | undefined;
      if (!alt) return;

      const figure: Element = {
        type: "element",
        tagName: "figure",
        properties: {},
        children: [
          img,
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: alt }],
          },
        ],
      };
      (parent.children as Element[])[index] = figure;
    });
  };
}

/** Rewrite relative URLs in href/src attributes based on slug and base path.
 *  - `./foo` and `./foo.md` both resolve to the page slug `/foo`
 *  - `../bar` resolves relative to the current slug's directory
 */
function rehypeRelativeUrls(options: { slug: string; base: string; isFolder?: boolean }) {
  const { slug, base, isFolder } = options;
  // For a document slug "/guides/setup", dir is "guides/"
  // For a folder slug "/guides/setup" (index.md), dir is "guides/setup/"
  const bare = slug.slice(1); // strip leading /
  let dir: string;
  if (isFolder) {
    dir = bare ? bare + "/" : "";
  } else {
    dir = bare.includes("/")
      ? bare.substring(0, bare.lastIndexOf("/") + 1)
      : "";
  }
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      for (const attr of ["href", "src"] as const) {
        let val = node.properties[attr];
        if (typeof val !== "string") continue;

        // Absolute internal links (e.g. /slug from wiki links) — just prepend base
        if (val.startsWith("/")) {
          if (base) node.properties[attr] = `${base}${val}`;
          continue;
        }

        // Only process relative paths (not absolute, protocol, or anchor-only)
        if (!val.startsWith("./") && !val.startsWith("../")) continue;

        // Strip .md extension from links (./foo.md → ./foo, ./foo.md#bar → ./foo#bar)
        if (attr === "href") {
          val = val.replace(/\.md(#|$)/, "$1");
        }

        // Separate fragment before resolving the path
        let fragment = "";
        const hashIdx = val.indexOf("#");
        if (hashIdx !== -1) {
          fragment = val.slice(hashIdx);
          val = val.slice(0, hashIdx);
        }

        // Resolve the relative path against the current slug's directory
        const parts = (dir + val).split("/");
        const resolved: string[] = [];
        for (const part of parts) {
          if (part === "." || part === "") continue;
          if (part === "..") resolved.pop();
          else resolved.push(part);
        }

        // Strip trailing /index — folder slugs don't include it
        let resolvedPath = resolved.join("/");
        resolvedPath = resolvedPath.replace(/\/index$/, "");

        node.properties[attr] = `${base}/${resolvedPath}${fragment}`;
      }
    });
  };
}

// ---------------------------------------------------------------------------
// Heading extraction from hast tree
// ---------------------------------------------------------------------------

function extractHeadingsFromHast(tree: Root): Heading[] {
  const headings: Heading[] = [];
  const levels: Record<string, number> = { h2: 2, h3: 3, h4: 4 };
  visit(tree, "element", (node: Element) => {
    const level = levels[node.tagName];
    if (!level) return;
    const id = node.properties.id as string | undefined;
    if (!id) return;
    headings.push({ id, text: toString(node), level });
  });
  return headings;
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export interface RenderResult {
  hast: Root;
  headings: Heading[];
}

export async function renderMarkdown(
  content: string,
  slug: string,
  languages: string[],
  base = "",
  isFolder = false,
): Promise<RenderResult> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHeadingId)
    .use(remarkWikiLinks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeMermaid)
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
      langs: languages,
    } as RehypeShikiOptions)
    .use(rehypeStripShikiBg)
    .use(rehypeTableWrap)
    .use(rehypeFigure)
    .use(rehypeRelativeUrls, { slug, base, isFolder });

  const mdast = processor.parse(content);
  const hast = (await processor.run(mdast)) as Root;
  const headings = extractHeadingsFromHast(hast);

  return { hast, headings };
}

// ---------------------------------------------------------------------------
// Link extraction (used by validate)
// ---------------------------------------------------------------------------

export interface InternalLink {
  slug: string;
  href: string;
}

export function extractInternalLinks(hast: Root, base: string): InternalLink[] {
  const links: InternalLink[] = [];
  visit(hast, "element", (node: Element) => {
    if (node.tagName !== "a") return;
    const href = node.properties.href;
    if (typeof href !== "string") return;
    if (/^(https?:\/\/|mailto:|#)/.test(href)) return;

    let slug = href;
    if (base && slug.startsWith(base)) slug = slug.slice(base.length);
    slug = slug.replace(/#.*$/, "");
    // Normalize: ensure leading / and no trailing /
    if (!slug.startsWith("/")) slug = "/" + slug;
    if (slug !== "/" && slug.endsWith("/")) slug = slug.replace(/\/+$/, "");

    links.push({ slug, href });
  });
  return links;
}
