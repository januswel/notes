import { readFileSync } from "fs";
import { globSync } from "glob";

const SHORTCODE = /\{\{\s*card\s*\(\s*url\s*=\s*"([^"]+)"\s*\)\s*\}\}/g;

/**
 * `content/**\/*.md` を走査し、`{{ card(url="...") }}` の引数 URL を集める。
 * frontmatter (`+++ ... +++`) とコードフェンス内は除外する。
 */
export function collectUrls(contentDir: string): string[] {
  const files = globSync(`${contentDir}/**/*.md`);
  const urls = new Set<string>();

  for (const file of files) {
    const text = readFileSync(file, "utf-8");
    const lines = text.split(/\r?\n/);

    let inFrontmatter = false;
    let inCodeFence = false;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];

      // frontmatter (TOML / YAML 両方)
      if (i === 0 && (raw === "+++" || raw === "---")) {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter) {
        if (raw === "+++" || raw === "---") inFrontmatter = false;
        continue;
      }

      // code fence
      if (/^```/.test(raw) || /^~~~/.test(raw)) {
        inCodeFence = !inCodeFence;
        continue;
      }
      if (inCodeFence) continue;

      SHORTCODE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = SHORTCODE.exec(raw)) !== null) {
        const candidate = match[1];
        try {
          new URL(candidate);
          urls.add(candidate);
        } catch {
          // 無効な URL は無視
        }
      }
    }
  }

  return [...urls];
}
