import { SidebarTree } from "./SidebarTree.tsx";
import { PageContent } from "./PageContent.tsx";

export function Layout() {
  return (
    <div class="kb-layout">
      <nav class="kb-sidebar" id="sidebar">
        <SidebarTree />
      </nav>
      <div class="kb-main">
        <PageContent />
        <div class="kb-spacer" />
      </div>
    </div>
  );
}
