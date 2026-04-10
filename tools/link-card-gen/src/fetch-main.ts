import {
  readdirSync,
  readFileSync,
  unlinkSync,
  existsSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { globSync } from "glob";
import { collectUrls } from "./collect-urls.js";
import { loadCache, saveCache } from "./cache.js";
import { extractMeta } from "./extract.js";
import { fetchPage, downloadAsset, assetExists } from "./fetch-page.js";
import type { CardCache, CardRecord } from "./types.js";

const baseDir = resolve(import.meta.dirname, "../../..");
const contentDir = join(baseDir, "content");
const cachePath = join(import.meta.dirname, "../cache/cards.json");
const assetsDir = join(baseDir, "static/link-cards");
const PUBLIC_PREFIX = "/link-cards";

const args = new Set(process.argv.slice(2));
const REFRESH_ALL = args.has("--refresh");
const REFRESH_FAILED = REFRESH_ALL || args.has("--refresh-failed");

async function processUrl(rawUrl: string, cache: CardCache): Promise<boolean> {
  const key = rawUrl;
  const existing = cache[key];

  // 既に成功キャッシュがあり、画像ファイルも残っているならスキップ
  if (existing && existing.status === "ok" && !REFRESH_ALL) {
    const imageOk = !existing.image || assetExists(assetsDir, existing.image);
    if (imageOk) {
      console.log(`  cached: ${key}`);
      return false;
    }
    console.log(`  re-download assets: ${key}`);
  }

  if (existing && existing.status === "failed" && !REFRESH_FAILED) {
    console.log(`  skip failed: ${key}`);
    return false;
  }

  console.log(`  fetch: ${key}`);
  try {
    const { finalUrl, html } = await fetchPage(key);
    const meta = extractMeta(html, finalUrl);

    const image = meta.imageUrl
      ? await downloadAsset(meta.imageUrl, assetsDir, PUBLIC_PREFIX)
      : undefined;

    const record: CardRecord = {
      url: key,
      status: "ok",
      fetchedAt: new Date().toISOString(),
      finalUrl: finalUrl !== key ? finalUrl : undefined,
      title: meta.title,
      description: meta.description,
      siteName: meta.siteName,
      image,
    };
    cache[key] = record;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`    failed: ${message}`);
    cache[key] = {
      url: key,
      status: "failed",
      fetchedAt: new Date().toISOString(),
      error: message,
    };
  }
  return true;
}

function cleanupOrphans(cache: CardCache): void {
  if (!existsSync(assetsDir)) return;
  const referenced = new Set<string>();
  for (const record of Object.values(cache)) {
    if (record.status !== "ok") continue;
    if (record.image) referenced.add(record.image.split("/").pop() ?? "");
  }
  let removed = 0;
  for (const filename of readdirSync(assetsDir)) {
    if (!referenced.has(filename)) {
      try {
        unlinkSync(join(assetsDir, filename));
        removed++;
      } catch {
        // ignore
      }
    }
  }
  if (removed > 0) console.log(`  cleaned up ${removed} orphan asset(s)`);
}

/**
 * cache に変更があったとき、`{{ card(` を含む md ファイルに同じ内容を書き戻して
 * 「Data 変更」イベントを発火させる。これにより `zola serve` が content 変更として
 * 検知し、該当ページを再レンダリングする。
 * 単なる mtime 更新（utimes）では Metadata イベントになり Zola serve が拾わないため、
 * writeFileSync で実体を書き直す必要がある。
 */
function touchCardMarkdownFiles(contentDir: string): number {
  const files = globSync(`${contentDir}/**/*.md`);
  let touched = 0;
  for (const file of files) {
    const text = readFileSync(file, "utf-8");
    if (/\{\{\s*card\s*\(/.test(text)) {
      writeFileSync(file, text, "utf-8");
      touched++;
    }
  }
  return touched;
}

/**
 * マークダウン側で参照されていない（孤児になった）cache キーを削除する。
 */
function pruneOrphanCacheKeys(cache: CardCache, urls: string[]): number {
  const referenced = new Set(urls);
  let removed = 0;
  for (const key of Object.keys(cache)) {
    if (!referenced.has(key)) {
      delete cache[key];
      removed++;
    }
  }
  return removed;
}

async function main() {
  console.log("link-card-gen: fetch phase");
  const urls = collectUrls(contentDir);
  console.log(`  found ${urls.length} card URL(s) in content/`);

  const cache = loadCache(cachePath);
  let mutated = false;

  for (const url of urls) {
    try {
      if (await processUrl(url, cache)) mutated = true;
      // 礼儀: 連続 fetch を避ける
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.error(`unexpected error for ${url}:`, err);
    }
  }

  const orphanKeys = pruneOrphanCacheKeys(cache, urls);
  if (orphanKeys > 0) {
    console.log(`  pruned ${orphanKeys} orphan cache key(s)`);
    mutated = true;
  }

  cleanupOrphans(cache);
  saveCache(cachePath, cache);
  console.log(`  wrote ${cachePath}`);

  if (mutated) {
    const touched = touchCardMarkdownFiles(contentDir);
    if (touched > 0) {
      console.log(
        `  touched ${touched} markdown file(s) for zola serve reload`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
