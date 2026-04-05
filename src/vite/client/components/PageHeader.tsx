import { base } from "../store";
import type { PageData } from "../types";

export function PageHeader({ page }: { page: PageData }) {
  const href = page.slug ? `${base.value}/${page.slug}` : `${base.value}/`;

  return (
    <header class="kb-header">
      <h1>
        <a href={href}>{page.name}</a>
      </h1>
      {page.meta?.description && (
        <p class="kb-description">{page.meta.description}</p>
      )}
    </header>
  );
}
