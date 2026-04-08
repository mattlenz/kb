import { useEffect, useRef, useState } from "preact/hooks";

const PLANTUML_SERVER = "https://www.plantuml.com/plantuml/svg";

async function encode(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const compressed = await new Response(cs.readable).arrayBuffer();
  return encode64(new Uint8Array(compressed));
}

function encode64(data: Uint8Array): string {
  let r = "";
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i];
    const b2 = i + 1 < data.length ? data[i + 1] : 0;
    const b3 = i + 2 < data.length ? data[i + 2] : 0;
    r += append3bytes(b1, b2, b3);
  }
  return r;
}

function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

function encode6bit(b: number): string {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return "-";
  return "_";
}

export function PlantUMLBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart || !containerRef.current) return;
    let cancelled = false;

    encode(chart).then(async (encoded) => {
      if (cancelled) return;
      const res = await fetch(`${PLANTUML_SERVER}/${encoded}`);
      if (cancelled) return;
      if (!res.ok) {
        setError("Failed to render PlantUML diagram");
        return;
      }
      const svg = await res.text();
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = `<div class="plantuml-diagram">${svg}</div>`;
        setRendered(true);
      }
    }).catch(() => {
      if (!cancelled) setError("Failed to render PlantUML diagram");
    });

    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return <div class="plantuml-error">{error}</div>;
  }

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
