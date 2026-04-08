import { pageData, notFound, base, rootName } from "../store.ts";
import { Breadcrumbs } from "./Breadcrumbs.tsx";
import { PageHeader } from "./PageHeader.tsx";
import { Outline } from "./Outline.tsx";
import { HastContent } from "./HastContent.tsx";


export function PageContent() {
  const page = notFound.value
    ? {
        slug: "",
        name: "Page not found",
        kind: "document" as const,
        meta: { title: "Page not found", description: "The page you're looking for doesn't exist." },
        breadcrumbs: [{ label: rootName.value, slug: "/" }],
      }
    : pageData.value;
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
            {notFound.value && (
              <div class="prose">
                <p><a href={base.value + "/"}>Back to home</a></p>
              </div>
            )}
          </div>
        </article>
      </div>
      <aside class="kb-outline-container">
        {page.headings && page.headings.length > 0 && (
          <Outline title={page.name} headings={page.headings} />
        )}
      </aside>
    </div>
  );
}
