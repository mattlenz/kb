import { tree, rootName, expandedFolders } from "../store";
import { TreeNodeItem } from "./TreeNodeItem";
import type { TreeNode } from "../types";

export function SidebarTree() {
  const rootNode: TreeNode = {
    slug: "",
    name: rootName.value,
    kind: "folder",
    children: tree.value,
  };

  return <TreeNodeItem node={rootNode} depth={0} expandedState={expandedFolders} />;
}
