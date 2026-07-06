import { join } from "path";
import { collectUrls } from "./collect-urls.js";
import { loadCache } from "./cache.js";
import {
  CARD_SHORTCODE_PATTERN,
  XPOST_SHORTCODE_PATTERN,
} from "./patterns.js";

interface EmbedRecord {
  status: "ok" | "failed";
  manual?: boolean;
}

interface EmbedGroup {
  label: string;
  pattern: RegExp;
  cacheFile: string;
}

const GROUPS: EmbedGroup[] = [
  { label: "card", pattern: CARD_SHORTCODE_PATTERN, cacheFile: "cache/cards.json" },
  { label: "x_post", pattern: XPOST_SHORTCODE_PATTERN, cacheFile: "cache/posts.json" },
];

/**
 * content/ の card / x_post shortcode URL のうち、cache に status ok レコードが
 * 無いものを warn として列挙する。watch は fetch を走らせないため、開発中に
 * `mise run fetch` の実行が必要だと気付けるようにするのが目的。
 */
export function warnUncachedEmbeds(contentDir: string, toolDir: string): void {
  const missing: string[] = [];
  const failed: string[] = [];

  for (const group of GROUPS) {
    const urls = collectUrls(contentDir, group.pattern);
    const cache = loadCache<EmbedRecord>(join(toolDir, group.cacheFile));
    for (const url of urls) {
      const record = cache[url];
      // manual エントリは手動メンテ対象で fetch がスキップするため除外
      if (record?.manual) continue;
      if (!record) {
        missing.push(`  ${group.label}: ${url}`);
      } else if (record.status !== "ok") {
        failed.push(`  ${group.label}: ${url}`);
      }
    }
  }

  if (missing.length > 0) {
    console.warn(
      `[preprocess] ${missing.length} embed(s) not yet cached — run \`mise run fetch\`:`
    );
    for (const line of missing) console.warn(line);
  }
  if (failed.length > 0) {
    console.warn(
      `[preprocess] ${failed.length} embed(s) previously failed — run \`mise run fetch --refresh-failed\`:`
    );
    for (const line of failed) console.warn(line);
  }
}
