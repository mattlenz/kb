import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
import type { Root } from "hast";
import { MermaidBlock } from "./MermaidBlock";

export function HastContent({ hast }: { hast: Root }) {
  return toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: "html",
    components: {
      "kb-mermaid": MermaidBlock as never,
    },
  });
}
