import { base } from "../store";
import { navigate } from "../navigate";
import { ChevronIcon } from "./icons";
import type { Breadcrumb } from "../types";

export function Breadcrumbs({ breadcrumbs }: { breadcrumbs?: Breadcrumb[] }) {
  const ancestors = breadcrumbs?.slice(0, -1);
  if (!ancestors || ancestors.length === 0) return null;

  const handleClick = (slug: string) => (e: Event) => {
    e.preventDefault();
    navigate(slug);
  };

  return (
    <nav class="kb-breadcrumbs">
      {ancestors.map((crumb, i) => (
        <span key={crumb.slug}>
          {i > 0 && <ChevronIcon />}
          <a
            href={crumb.slug ? `${base.value}/${crumb.slug}` : `${base.value}/`}
            onClick={handleClick(crumb.slug)}
          >
            {crumb.label}
          </a>
        </span>
      ))}
    </nav>
  );
}
