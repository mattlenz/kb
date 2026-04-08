import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
import type { Root } from "hast";
import { MermaidBlock } from "./MermaidBlock.tsx";

function ExternalLink(props: Record<string, unknown>) {
  const href = props.href as string | undefined;
  if (href && /^https?:\/\//.test(href)) {
    return <a {...props} target="_blank" rel="noopener noreferrer" />;
  }
  return <a {...props} />;
}

export function HastContent({ hast }: { hast: Root }) {
  return toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: "html",
    components: {
      "kb-mermaid": MermaidBlock as never,
      a: ExternalLink as never,
    },
  });
}
