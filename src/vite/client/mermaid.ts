const lightVars = {
  primaryColor: "#e8ebea",
  primaryTextColor: "#171a18",
  primaryBorderColor: "#ced1cf",
  lineColor: "#9fa1a0",
  secondaryColor: "#f3f6f4",
  tertiaryColor: "#ffffff",
  background: "#ffffff",
  mainBkg: "#e8ebea",
  nodeBorder: "#ced1cf",
  clusterBkg: "#f3f6f4",
  titleColor: "#171a18",
  edgeLabelBackground: "#ffffff",
};

const darkVars = {
  primaryColor: "#2a2d2b",
  primaryTextColor: "#dfe1e0",
  primaryBorderColor: "#3f4140",
  lineColor: "#9fa1a0",
  secondaryColor: "#1a1c1b",
  tertiaryColor: "#0a0a0b",
  background: "#0a0a0b",
  mainBkg: "#2a2d2b",
  nodeBorder: "#3f4140",
  clusterBkg: "#1a1c1b",
  titleColor: "#dfe1e0",
  edgeLabelBackground: "#0a0a0b",
};

const placeholders = document.querySelectorAll<HTMLElement>(".mermaid-placeholder");
if (placeholders.length > 0) {
  let id = 0;

  import("mermaid").then(
    async (mod) => {
      const mermaid = mod.default;

      for (const el of placeholders) {
        const chart = el.dataset.chart;
        if (!chart) continue;

        // Render light
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          themeVariables: lightVars,
        });
        const lightResult = await mermaid.render(`mermaid-l-${id}`, chart);

        // Render dark
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          themeVariables: darkVars,
        });
        const darkResult = await mermaid.render(`mermaid-d-${id}`, chart);

        // Clear all placeholder styling before inserting rendered diagrams
        el.className = "";
        el.removeAttribute("style");
        el.innerHTML = `
          <div class="mermaid-diagram mermaid-light my-4">${lightResult.svg}</div>
          <div class="mermaid-diagram mermaid-dark my-4">${darkResult.svg}</div>
        `;
        id++;
      }
    },
  );
}
