import {
  currentSlug,
  pageData,
  rootName,
  base,
  expandAncestors,
} from "./store";
import type { PageData } from "./types";

export async function navigate(slug: string, pushState = true) {
  if (slug === currentSlug.value) return;

  const apiSlug = slug || "_index";
  const url = `${base.value}/__kb_api/${encodeURI(apiSlug)}.json`;
  const res = await fetch(url);
  const data: PageData = await res.json();

  currentSlug.value = slug;
  pageData.value = data;
  expandAncestors(slug);
  document.title = slug ? `${data.name} — ${rootName.value}` : rootName.value;

  if (pushState) {
    const href = slug ? `${base.value}/${encodeURI(slug)}` : `${base.value}/`;
    history.pushState(null, "", href);
  }

  document.querySelector(".kb-main")?.scrollTo(0, 0);
}

function slugFromLocation(): string {
  const pathname = base.value
    ? window.location.pathname.replace(new RegExp(`^${base.value}`), "")
    : window.location.pathname;
  const decoded = decodeURIComponent(pathname);
  return decoded === "/" ? "" : decoded.replace(/\/$/, "").slice(1);
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    navigate(slugFromLocation(), false);
  });
}
