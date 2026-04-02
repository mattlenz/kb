import type { KnowledgeNode, Breadcrumb, Heading } from "../core/index";

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const chevronSvg = (expanded: boolean) =>
  `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"${expanded ? ' class="expanded"' : ""}><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>`;

const folderSvg = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>`;

const docSvg = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;

const chevronBreadcrumb = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>`;

function renderSidebarTree(
  nodes: KnowledgeNode[],
  currentSlug: string,
  depth: number,
): string {
  return nodes
    .map((node) => {
      const isActive = currentSlug === node.slug;
      const isAncestor =
        node.kind === "folder" &&
        (node.slug === "" ||
          currentSlug.startsWith(node.slug + "/") ||
          currentSlug === node.slug);

      const toggle =
        node.kind === "folder"
          ? `<button class="kb-tree-toggle" data-toggle="${esc(node.slug)}">${chevronSvg(isAncestor)}</button>`
          : `<span class="kb-tree-spacer"></span>`;

      const ariaCurrent = isActive ? ' aria-current="page"' : "";
      const href = node.slug ? `/${esc(node.slug)}` : "/";

      const children =
        node.kind === "folder" && node.children
          ? `<div data-children="${esc(node.slug)}"${isAncestor ? "" : " hidden"}>${renderSidebarTree(node.children, currentSlug, depth + 1)}</div>`
          : "";

      return `<div>
  <div class="kb-tree-node" style="padding-left: ${depth * 12}px">
    ${toggle}
    <a href="${href}" class="kb-tree-link"${ariaCurrent}>${esc(node.name)}</a>
  </div>
  ${children}
</div>`;
    })
    .join("");
}

function renderBreadcrumbs(breadcrumbs: Breadcrumb[]): string {
  const ancestors = breadcrumbs?.slice(0, -1);
  if (!ancestors || ancestors.length === 0) return "";

  return `<nav class="kb-breadcrumbs">${ancestors
    .map(
      (crumb, i) =>
        `<span>${i > 0 ? chevronBreadcrumb : ""}<a href="${crumb.slug ? `/${esc(crumb.slug)}` : "/"}">${esc(crumb.label)}</a></span>`,
    )
    .join("")}</nav>`;
}

function renderPageHeader(node: KnowledgeNode): string {
  const href = node.slug ? `/${esc(node.slug)}` : "/";
  const description = node.meta?.description
    ? `<p class="kb-description">${esc(node.meta.description)}</p>`
    : "";

  return `<header class="kb-header">
  <h1><a href="${href}">${esc(node.name)}</a></h1>
  ${description}
</header>`;
}

function renderOutline(headings: Heading[]): string {
  if (!headings || headings.length === 0) return "";
  return `<nav class="kb-outline" data-outline>${headings
    .map(
      (h) =>
        `<a href="#${esc(h.id)}" data-heading-id="${esc(h.id)}" style="padding-left: ${(h.level - 2) * 12}px">${esc(h.text)}</a>`,
    )
    .join("")}</nav>`;
}

function renderChildrenCards(nodes: KnowledgeNode[]): string {
  return `<div class="kb-children">${nodes
    .map((child) => {
      const href = child.slug ? `/${esc(child.slug)}` : "/";
      const icon = child.kind === "folder" ? folderSvg : docSvg;

      return `<a href="${href}" class="kb-child-card">
  <div class="kb-child-card-header">
    ${icon}
    <span class="kb-child-card-name">${esc(child.name)}</span>
  </div>
</a>`;
    })
    .join("")}</div>`;
}

export function renderPageBody(node: KnowledgeNode): string {
  const hasOutline = node.headings && node.headings.length > 0;
  const hasChildren = node.children && node.children.length > 0;

  const prose = node.html
    ? `<div class="prose">${node.html}</div>`
    : "";

  const children = hasChildren
    ? renderChildrenCards(node.children!)
    : "";

  const outline = hasOutline ? renderOutline(node.headings!) : "";

  const breadcrumbs = renderBreadcrumbs(node.breadcrumbs ?? []);

  return `<div class="kb-page">
  <div class="kb-safe">
    <article class="kb-content">
      ${breadcrumbs}
      <div class="kb-prose">
        ${renderPageHeader(node)}
        ${prose}
        ${children}
      </div>
    </article>
  </div>
  <aside class="kb-outline-container">
    ${outline}
  </aside>
</div>`;
}

export function renderLayout(
  tree: KnowledgeNode[],
  rootName: string,
  currentSlug: string,
  bodyHtml: string,
): string {
  const rootNode: KnowledgeNode = {
    slug: "",
    name: rootName,
    kind: "folder",
    children: tree,
  };

  return `<div class="kb-layout">
  <nav class="kb-sidebar" id="sidebar">
    ${renderSidebarTree([rootNode], currentSlug, 0)}
  </nav>
  <div class="kb-main">
    ${bodyHtml}
    <div class="kb-spacer"></div>
  </div>
</div>`;
}
