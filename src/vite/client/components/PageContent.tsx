import { pageData } from "../store";
import { Breadcrumbs } from "./Breadcrumbs";
import { PageHeader } from "./PageHeader";
import { Outline } from "./Outline";
import { HastContent } from "./HastContent";

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
        <Outline headings={page.headings} />
      </aside>
    </div>
  );
}
