import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import { createHighlighter, type Highlighter } from "shiki";
import type { Heading } from "./types";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(languages: string[]): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: languages,
    });
  }
  return highlighterPromise;
}

export async function renderMarkdown(
  content: string,
  slug: string,
  languages: string[],
  base = "",
): Promise<string> {
  const highlighter = await getHighlighter(languages);

  const result = await remark()
    .use(remarkGfm)
    // allowDangerousHtml passes through raw HTML in markdown source
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  let html = String(result);

  // Replace <code> blocks with shiki-highlighted versions
  html = html.replace(
    /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
    (_, lang, code) => {
      const decoded = code
        .replace(/&#x([0-9a-fA-F]+);/g, (_: string, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_: string, dec: string) => String.fromCodePoint(Number(dec)))
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

      // Mermaid blocks become client-side placeholders
      if (lang === "mermaid") {
        const encoded = decoded
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<div class="mermaid-placeholder animate-pulse h-32 bg-neutral-100 dark:bg-neutral-900 rounded my-4" data-chart="${encoded}"></div>`;
      }

      try {
        const shikiHtml = highlighter.codeToHtml(decoded, {
          lang,
          themes: { light: "github-light", dark: "github-dark" },
        });
        return shikiHtml.replace(/background-color:[^;"]+;?/g, "");
      } catch {
        return `<pre><code class="language-${lang}">${code}</code></pre>`;
      }
    },
  );

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
