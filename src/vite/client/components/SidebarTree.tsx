import { tree, rootName, currentSlug, base, expandedFolders } from "../store";
import { navigate } from "../navigate";
import { ChevronIcon } from "./icons";
import type { TreeNode } from "../types";

function TreeNodeItem({
  node,
  depth,
}: {
  node: TreeNode;
  depth: number;
}) {
  const slug = currentSlug.value;
  const isActive = slug === node.slug;
  const isExpanded = expandedFolders.value.has(node.slug);

  const handleToggle = (e: Event) => {
    e.stopPropagation();
    const next = new Set(expandedFolders.value);
    if (next.has(node.slug)) {
      next.delete(node.slug);
    } else {
      next.add(node.slug);
    }
    expandedFolders.value = next;
  };

  const handleClick = (e: Event) => {
    e.preventDefault();
    navigate(node.slug);
  };

  const href = node.slug ? `${base.value}/${node.slug}` : `${base.value}/`;

  return (
    <div>
      <div class="kb-tree-node" style={`padding-left: ${depth * 12}px`}>
        {node.kind === "folder" ? (
          <button class="kb-tree-toggle" onClick={handleToggle}>
            <ChevronIcon expanded={isExpanded} />
          </button>
        ) : (
          <span class="kb-tree-spacer" />
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
            <TreeNodeItem key={child.slug} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarTree() {
  const rootNode: TreeNode = {
    slug: "",
    name: rootName.value,
    kind: "folder",
    children: tree.value,
  };

  return <TreeNodeItem node={rootNode} depth={0} />;
}
