export interface DocumentMeta {
  title: string;
  description?: string;
}

export interface Breadcrumb {
  label: string;
  slug: string;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface KnowledgeNode {
  slug: string;
  name: string;
  kind: "folder" | "document";
  meta?: DocumentMeta;
  content?: string;
  html?: string;
  headings?: Heading[];
  children?: KnowledgeNode[];
  breadcrumbs?: Breadcrumb[];
  /** File mtime for sorting — not exposed to UI. */
  _mtime?: number;
}

export interface KbConfig {
  /** Site/knowledge base title. */
  title?: string;
  /** Path to content directory, relative to root. Default: "docs" */
  contentDir?: string;
  /** Base path for deployment (e.g. "/repo-name" for GitHub Pages). Default: "" */
  base?: string;
  /** Custom shiki languages to load. */
  languages?: string[];
}

export interface ResolvedKbConfig {
  title: string;
  contentDir: string;
  rootDir: string;
  base: string;
  languages: string[];
}
