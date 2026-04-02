import path from "node:path";
import type { KbConfig, ResolvedKbConfig } from "./types";

const DEFAULT_LANGUAGES = [
  "typescript", "javascript", "tsx", "jsx", "json", "bash", "shell",
  "yaml", "markdown", "css", "html", "python", "go", "rust", "sql",
  "graphql", "diff", "toml",
];

export function defineConfig(config: KbConfig): KbConfig {
  return config;
}

export function resolveConfig(
  rootDir: string,
  userConfig?: KbConfig,
): ResolvedKbConfig {
  return {
    title: userConfig?.title ?? "Knowledge Base",
    contentDir: path.resolve(rootDir, userConfig?.contentDir ?? "docs"),
    rootDir,
    languages: userConfig?.languages ?? DEFAULT_LANGUAGES,
  };
}

/**
 * Load a kb.config.ts file from the given directory.
 * Returns undefined if no config file exists.
 */
export async function loadConfigFile(
  rootDir: string,
): Promise<KbConfig | undefined> {
  const configPath = path.join(rootDir, "kb.config.ts");
  try {
    const mod = await import(/* @vite-ignore */ configPath);
    return mod.default ?? mod;
  } catch {
    // No config file or failed to load — use defaults
    return undefined;
  }
}
