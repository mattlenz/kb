import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeShiki, { type RehypeShikiOptions } from "@shikijs/rehype";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { Heading } from "./types";

/**
 * Rehype plugin that extracts mermaid code blocks into client-side placeholders
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

      // Extract raw text from the code node
      const raw = code.children
        .filter((c): c is { type: "text"; value: string } => c.type === "text")
        .map((c) => c.value)
        .join("");

      const encoded = raw
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Replace the <pre> node with a mermaid placeholder div
      (parent.children as Element[])[index] = {
        type: "element",
        tagName: "div",
        properties: {
          className: [
            "mermaid-placeholder",
            "animate-pulse",
            "h-32",
            "bg-neutral-100",
            "dark:bg-neutral-900",
            "rounded",
            "my-4",
          ],
          dataChart: encoded,
        },
        children: [],
      };
    });
  };
}

export async function renderMarkdown(
  content: string,
  slug: string,
  languages: string[],
  base = "",
): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeMermaid)
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
      langs: languages,
    } as RehypeShikiOptions)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  let html = String(result);

  // Strip shiki background-color so our theme controls it
  html = html.replace(/background-color:[^;"]+;?/g, "");

  // Wrap tables in a scrollable container
  html = html.replace(/<table>/g, '<div class="table-wrapper"><table>');
  html = html.replace(/<\/table>/g, "</table></div>");

  // Wrap standalone images in <figure> with <figcaption> from alt text
  html = html.replace(
    /<p><img([^>]*) alt="([^"]+)"([^>]*)><\/p>/g,
    (_, before, alt, after) =>
      `<figure><img${before} alt="${alt}"${after}><figcaption>${alt}</figcaption></figure>`,
  );

  // Rewrite relative URLs so they resolve correctly
  if (slug) {
    const dir = slug.includes("/")
      ? slug.substring(0, slug.lastIndexOf("/") + 1)
      : slug + "/";
    html = html.replace(
      /(src|href)="\.\/([^"]+)"/g,
      (_, attr, relative) => `${attr}="${base}/${dir}${relative}"`,
    );
  }

  return html;
}

export function extractHeadings(html: string): Heading[] {
  const headings: Heading[] = [];
  const pattern = /<h([2-4])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const text = match[3].replace(/<[^>]+>/g, "").trim();
    headings.push({ id: match[2], text, level: Number(match[1]) });
  }
  return headings;
}
