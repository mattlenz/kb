import {
  currentSlug,
  pageData,
  rootName,
  base,
  expandAncestors,
  mobileMenuOpen,
} from "./store.ts";
import type { PageData } from "./types.ts";

export async function navigate(slug: string, pushState = true) {
  if (slug === currentSlug.value) return;

  const apiSlug = slug === "/" ? "_index" : slug.slice(1);
  const url = `${base.value}/__kb_api/${encodeURI(apiSlug)}.json`;
  const res = await fetch(url);
  const data: PageData = await res.json();

  currentSlug.value = slug;
  pageData.value = data;
  expandAncestors(slug);
  document.title = slug === "/" ? rootName.value : `${data.name} — ${rootName.value}`;

  if (pushState) {
    history.pushState(null, "", base.value + encodeURI(slug));
  }

  mobileMenuOpen.value = false;
  document.querySelector(".kb-main")?.scrollTo(0, 0);
}

function slugFromLocation(): string {
  const pathname = base.value
    ? window.location.pathname.replace(new RegExp(`^${base.value}`), "")
    : window.location.pathname;
  const decoded = decodeURIComponent(pathname);
  return decoded.replace(/\/$/, "") || "/";
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    navigate(slugFromLocation(), false);
  });
}
