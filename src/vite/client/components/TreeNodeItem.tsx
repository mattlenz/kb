import type { Signal } from "@preact/signals";
import { currentSlug, base } from "../store.ts";
import { navigate } from "../navigate.ts";
import { ChevronIcon, DocIcon } from "./icons.tsx";
import type { TreeNode } from "../types.ts";

export function TreeNodeItem({
  node,
  depth,
  expandedState,
}: {
  node: TreeNode;
  depth: number;
  expandedState: Signal<Set<string>>;
}) {
  const slug = currentSlug.value;
  const isActive = slug === node.slug;
  const isExpanded = expandedState.value.has(node.slug);

  const handleToggle = (e: Event) => {
    e.stopPropagation();
    const next = new Set(expandedState.value);
    if (next.has(node.slug)) {
      next.delete(node.slug);
    } else {
      next.add(node.slug);
    }
    expandedState.value = next;
  };

  const handleClick = (e: Event) => {
    e.preventDefault();
    navigate(node.slug);
  };

  const href = base.value + encodeURI(node.slug);

  return (
    <div>
      <div class="kb-tree-node" style={`padding-left: ${depth * 12}px`}>
        {node.kind === "folder" ? (
          <button class="kb-tree-toggle" onClick={handleToggle}>
            <ChevronIcon expanded={isExpanded} />
          </button>
        ) : (
          <span class="kb-tree-icon"><DocIcon /></span>
        )}
        <a
          href={href}
          class="kb-tree-link"
          aria-current={isActive ? "page" : undefined}
          onClick={handleClick}
        >
          {node.name}
        </a>
      </div>
      {node.kind === "folder" && node.children && (
        <div hidden={!isExpanded}>
          {node.children.map((child) => (
            <TreeNodeItem key={child.slug} node={child} depth={depth + 1} expandedState={expandedState} />
          ))}
        </div>
      )}
    </div>
  );
}
