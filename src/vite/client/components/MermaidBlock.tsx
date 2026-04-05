import { useEffect, useRef, useState } from "preact/hooks";

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

let nextId = 0;

export function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!chart || !containerRef.current) return;
    let cancelled = false;

    import("mermaid").then(async (mod) => {
      if (cancelled) return;
      const mermaid = mod.default;
      const id = nextId++;

      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        themeVariables: lightVars,
      });
      const lightResult = await mermaid.render(`mermaid-l-${id}`, chart);

      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        themeVariables: darkVars,
      });
      const darkResult = await mermaid.render(`mermaid-d-${id}`, chart);

      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="mermaid-diagram mermaid-light my-4">${lightResult.svg}</div>
          <div class="mermaid-diagram mermaid-dark my-4">${darkResult.svg}</div>
        `;
        setRendered(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div ref={containerRef}>
      {!rendered && (
        <div
          class="animate-pulse bg-neutral-100 dark:bg-neutral-900 rounded my-4"
          style="height: 8rem"
        />
      )}
    </div>
  );
}
