import * as preact from "preact";
import { base } from "../store.ts";
import { navigate } from "../navigate.ts";
import { ChevronIcon } from "./icons.tsx";
import type { Breadcrumb } from "../types.ts";

export function Breadcrumbs({ breadcrumbs }: { breadcrumbs?: Breadcrumb[] }) {
  const ancestors = breadcrumbs;
  if (!ancestors || ancestors.length === 0) return null;

  const handleClick = (slug: string) => (e: Event) => {
    e.preventDefault();
    navigate(slug);
  };

  const items: preact.JSX.Element[] = [];
  ancestors.forEach((crumb, i) => {
    if (i > 0) {
      items.push(<span class="kb-breadcrumb-sep"><ChevronIcon /></span>);
    }
    items.push(
      <a
        href={crumb.slug ? `${base.value}/${encodeURI(crumb.slug)}` : `${base.value}/`}
        onClick={handleClick(crumb.slug)}
      >
        {crumb.label}
      </a>
    );
  });

  return <nav class="kb-breadcrumbs">{items}</nav>;
}
