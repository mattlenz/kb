import type { Root } from "hast";

/** Client-safe subset of KnowledgeNode for page data. */
export interface PageData {
  slug: string;
  name: string;
  kind: "folder" | "document";
  meta?: { title: string; description?: string };
  hast?: Root;
  headings?: Heading[];
  children?: TreeNode[];
  breadcrumbs?: Breadcrumb[];
}

/** Sidebar tree node — structure only, no rendered content. */
export interface TreeNode {
  slug: string;
  name: string;
  kind: "folder" | "document";
  children?: TreeNode[];
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface Breadcrumb {
  label: string;
  slug: string;
}
