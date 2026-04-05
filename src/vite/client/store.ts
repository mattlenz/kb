import { signal } from "@preact/signals";
import type { PageData, TreeNode } from "./types";

export const tree = signal<TreeNode[]>([]);
export const rootName = signal("");
export const currentSlug = signal("");
export const pageData = signal<PageData | null>(null);
export const base = signal("");

/** Set of expanded folder slugs in the sidebar. */
export const expandedFolders = signal<Set<string>>(new Set());

/** Expand all ancestor folders for a given slug. */
export function expandAncestors(slug: string) {
  if (!slug) return;
  const parts = slug.split("/");
  const next = new Set(expandedFolders.value);
  // Always expand root
  next.add("");
  for (let i = 1; i <= parts.length; i++) {
    next.add(parts.slice(0, i).join("/"));
  }
  expandedFolders.value = next;
}
