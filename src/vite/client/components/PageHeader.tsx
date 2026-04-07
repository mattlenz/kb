import type { PageData } from "../types";

export function PageHeader({ page }: { page: PageData }) {

  return (
    <header class="kb-header">
      <h1>{page.name}</h1>
      {page.meta?.description && (
        <p class="kb-description">{page.meta.description}</p>
      )}
    </header>
  );
}
