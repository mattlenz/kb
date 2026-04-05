import { base } from "../store";
import { navigate } from "../navigate";
import { FolderIcon, DocIcon } from "./icons";
import type { TreeNode } from "../types";

export function ChildrenCards({ children }: { children: TreeNode[] }) {
  if (!children || children.length === 0) return null;

  const handleClick = (slug: string) => (e: Event) => {
    e.preventDefault();
    navigate(slug);
  };

  return (
    <div class="kb-children">
      {children.map((child) => {
        const href = child.slug
          ? `${base.value}/${child.slug}`
          : `${base.value}/`;
        return (
          <a
            key={child.slug}
            href={href}
            class="kb-child-card"
            onClick={handleClick(child.slug)}
          >
            <div class="kb-child-card-header">
              {child.kind === "folder" ? <FolderIcon /> : <DocIcon />}
              <span class="kb-child-card-name">{child.name}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
