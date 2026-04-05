import { useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import type { Heading } from "../types";

const activeId = signal("");

export function Outline({ headings }: { headings?: Heading[] }) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!headings || headings.length === 0) return;

    const scrollRoot = document.querySelector(".kb-main") as HTMLElement | null;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId.value = entry.target.id;
          }
        }
      },
      {
        root: scrollRoot,
        rootMargin: "0px 0px -80% 0px",
        threshold: 0,
      },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [headings]);

  if (!headings || headings.length === 0) return null;

  return (
    <nav class="kb-outline" data-outline>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          data-heading-id={h.id}
          class={activeId.value === h.id ? "active" : undefined}
          style={`padding-left: ${(h.level - 2) * 12}px`}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}
