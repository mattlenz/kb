import { hydrate } from "preact";
import { Layout } from "./components/Layout.tsx";
import {
  tree,
  rootName,
  currentSlug,
  pageData,
  base,
  expandAncestors,
} from "./store.ts";
import "./navigate.ts";

// Read initial state embedded by the server
const initEl = document.getElementById("kb-data");
if (initEl) {
  const init = JSON.parse(initEl.textContent!);
  tree.value = init.tree;
  rootName.value = init.rootName;
  currentSlug.value = init.currentSlug;
  pageData.value = init.pageData;
  base.value = init.base;
  expandAncestors(init.currentSlug);
}

// Hydrate Preact onto the server-rendered layout
const root = document.querySelector(".kb-layout")?.parentElement;
if (root) {
  hydrate(<Layout />, root);
}

// HMR: listen for content updates from the Vite plugin
if (import.meta.hot) {
  import.meta.hot.on("kb:tree-update", (data: { tree: typeof tree.value; rootName: string }) => {
    tree.value = data.tree;
    rootName.value = data.rootName;
  });

  import.meta.hot.on("kb:page-update", (data: { slug: string; pageData: typeof pageData.value }) => {
    if (data.slug === currentSlug.value) {
      pageData.value = data.pageData;
    }
  });
}
