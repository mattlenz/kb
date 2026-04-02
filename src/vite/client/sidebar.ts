const currentSlug = window.location.pathname === "/" ? "" : window.location.pathname.slice(1);

// Expand ancestors of current page
if (currentSlug) {
  const parts = currentSlug.split("/");
  for (let i = 0; i <= parts.length; i++) {
    const ancestor = parts.slice(0, i).join("/");
    const container = document.querySelector(`[data-children="${ancestor}"]`);
    if (container) {
      container.removeAttribute("hidden");
      const svg = document.querySelector(`[data-toggle="${ancestor}"] svg`);
      svg?.classList.add("rotate-90");
    }
  }
}

// Toggle handlers
document.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const slug = btn.dataset.toggle!;
    const container = document.querySelector(`[data-children="${slug}"]`);
    if (!container) return;
    const svg = btn.querySelector("svg");
    if (container.hasAttribute("hidden")) {
      container.removeAttribute("hidden");
      svg?.classList.add("rotate-90");
    } else {
      container.setAttribute("hidden", "");
      svg?.classList.remove("rotate-90");
    }
  });
});
