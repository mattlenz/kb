import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkHeadingId from "remark-heading-id";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeShiki, { type RehypeShikiOptions } from "@shikijs/rehype";
import { toString } from "hast-util-to-string";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { Heading } from "./types";

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

/** Rewrite `./` relative URLs in href/src attributes based on slug and base path. */
function rehypeRelativeUrls(options: { slug: string; base: string }) {
  const { slug, base } = options;
  const dir = slug.includes("/")
    ? slug.substring(0, slug.lastIndexOf("/") + 1)
    : "";
  return (tree: Root) => {
    if (!dir && !base) return;
    visit(tree, "element", (node: Element) => {
      for (const attr of ["href", "src"] as const) {
        const val = node.properties[attr];
        if (typeof val === "string" && val.startsWith("./")) {
          node.properties[attr] = `${base}/${dir}${val.slice(2)}`;
        }
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
): Promise<RenderResult> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHeadingId)
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
    .use(rehypeRelativeUrls, { slug, base });

  const mdast = processor.parse(content);
  const hast = (await processor.run(mdast)) as Root;
  const headings = extractHeadingsFromHast(hast);

  return { hast, headings };
}
