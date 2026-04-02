const nav = document.querySelector<HTMLElement>("[data-outline]");
if (nav) {
  const links = nav.querySelectorAll<HTMLAnchorElement>("a[data-heading-id]");
  const scrollRoot = document.querySelector(".kb-main") as HTMLElement | null;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          links.forEach((link) => {
            const isActive = link.dataset.headingId === entry.target.id;
            link.classList.toggle("text-neutral-900", isActive);
            link.classList.toggle("dark:text-neutral-100", isActive);
            link.classList.toggle("font-medium", isActive);
            link.classList.toggle("text-neutral-500", !isActive);
            link.classList.toggle("dark:text-neutral-400", !isActive);
          });
        }
      }
    },
    {
      root: scrollRoot,
      rootMargin: "0px 0px -80% 0px",
      threshold: 0,
    },
  );

  links.forEach((link) => {
    const el = document.getElementById(link.dataset.headingId!);
    if (el) observer.observe(el);
  });
}
