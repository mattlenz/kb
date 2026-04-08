import { tree, rootName, expandedFolders } from "../store.ts";
import { TreeNodeItem } from "./TreeNodeItem.tsx";
import type { TreeNode } from "../types.ts";

export function SidebarTree() {
  const rootNode: TreeNode = {
    slug: "",
    name: rootName.value,
    kind: "folder",
    children: tree.value,
  };

  return <TreeNodeItem node={rootNode} depth={0} expandedState={expandedFolders} />;
}
