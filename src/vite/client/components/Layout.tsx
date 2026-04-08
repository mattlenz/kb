import { SidebarTree } from "./SidebarTree.tsx";
import { PageContent } from "./PageContent.tsx";
import { MobileMenuButton, MobileMenuOverlay } from "./MobileMenu.tsx";

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
      <MobileMenuButton />
      <MobileMenuOverlay />
    </div>
  );
}
