import { signal } from "@preact/signals";
import type { PageData, TreeNode } from "./types";

export const tree = signal<TreeNode[]>([]);
export const rootName = signal("");
export const currentSlug = signal("");
export const pageData = signal<PageData | null>(null);
export const base = signal("");

/** Set of expanded folder slugs in the sidebar. */
export const expandedFolders = signal<Set<string>>(new Set());

/** Expand only the ancestor folders for a given slug (and root). */
export function expandAncestors(slug: string) {
  const next = new Set<string>();
  // Always expand root
  next.add("");
  if (slug) {
    const parts = slug.split("/");
    for (let i = 1; i <= parts.length; i++) {
      next.add(parts.slice(0, i).join("/"));
    }
  }
  expandedFolders.value = next;
}
