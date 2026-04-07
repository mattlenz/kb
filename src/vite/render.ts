import { h } from "preact";
import renderToString from "preact-render-to-string";
import { Layout } from "./client/components/Layout";
import {
  tree,
  rootName,
  currentSlug,
  pageData,
  base,
  expandAncestors,
} from "./client/store";
import type { PageData, TreeNode } from "./client/types";
import type { KnowledgeNode } from "../core/types";

/** Convert a KnowledgeNode tree to client-safe TreeNodes (no content/html). */
export function toTreeNodes(nodes: KnowledgeNode[]): TreeNode[] {
  return nodes.map((n) => ({
    slug: n.slug,
    name: n.name,
    kind: n.kind,
    children: n.children ? toTreeNodes(n.children) : undefined,
  }));
}

/** Convert a fully-loaded KnowledgeNode to a client PageData. */
export function toPageData(node: KnowledgeNode): PageData {
  return {
    slug: node.slug,
    name: node.name,
    kind: node.kind,
    meta: node.meta,
    hast: node.hast,
    headings: node.headings,
    children: node.children ? toTreeNodes(node.children) : undefined,
    breadcrumbs: node.breadcrumbs,
  };
}

interface RenderResult {
  html: string;
  initialData: {
    tree: TreeNode[];
    rootName: string;
    currentSlug: string;
    pageData: PageData;
    base: string;
  };
}

/**
 * Server-side render a page using Preact components.
 * Sets global signals, renders to string, and returns HTML + JSON for hydration.
 */
export function renderPage(
  treeData: { tree: KnowledgeNode[]; rootName: string },
  node: KnowledgeNode,
  basePath: string,
): RenderResult {
  const treeNodes = toTreeNodes(treeData.tree);
  const page = toPageData(node);

  // Set signal values for SSR
  tree.value = treeNodes;
  rootName.value = treeData.rootName;
  currentSlug.value = node.slug;
  pageData.value = page;
  base.value = basePath;
  expandAncestors(node.slug);

  const html = renderToString(h(Layout, null));

  return {
    html,
    initialData: {
      tree: treeNodes,
      rootName: treeData.rootName,
      currentSlug: node.slug,
      pageData: page,
      base: basePath,
    },
  };
}
