import { pageData } from "../store.ts";
import { Breadcrumbs } from "./Breadcrumbs.tsx";
import { PageHeader } from "./PageHeader.tsx";
import { Outline } from "./Outline.tsx";
import { HastContent } from "./HastContent.tsx";

export function PageContent() {
  const page = pageData.value;
  if (!page) return null;

  return (
    <div class="kb-page">
      <div class="kb-safe">
        <article class="kb-content">
          <Breadcrumbs breadcrumbs={page.breadcrumbs} />
          <div class="kb-prose">
            <PageHeader page={page} />
            {page.hast && (
              <div class="prose">
                <HastContent hast={page.hast} />
              </div>
            )}
          </div>
        </article>
      </div>
      <aside class="kb-outline-container">
        <Outline title={page.name} headings={page.headings} />
      </aside>
    </div>
  );
}
