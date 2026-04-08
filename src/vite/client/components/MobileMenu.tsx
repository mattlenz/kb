import { mobileMenuOpen } from "../store.ts";
import { SidebarTree } from "./SidebarTree.tsx";

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function MobileMenuButton() {
  return (
    <button
      class="kb-mobile-menu-btn"
      onClick={() => { mobileMenuOpen.value = true; }}
      aria-label="Open navigation"
    >
      <MenuIcon />
    </button>
  );
}

export function MobileMenuOverlay() {
  if (!mobileMenuOpen.value) return null;

  return (
    <div class="kb-mobile-overlay" onClick={() => { mobileMenuOpen.value = false; }}>
      <div class="kb-mobile-overlay-panel" onClick={(e: Event) => e.stopPropagation()}>
        <div class="kb-mobile-overlay-header">
          <button
            class="kb-mobile-menu-close"
            onClick={() => { mobileMenuOpen.value = false; }}
            aria-label="Close navigation"
          >
            <CloseIcon />
          </button>
        </div>
        <nav class="kb-mobile-overlay-nav">
          <SidebarTree />
        </nav>
      </div>
    </div>
  );
}
