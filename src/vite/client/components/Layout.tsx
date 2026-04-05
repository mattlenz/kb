import { SidebarTree } from "./SidebarTree";
import { PageContent } from "./PageContent";

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
