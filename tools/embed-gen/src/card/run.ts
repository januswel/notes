import { join } from "path";
import { collectUrls } from "../shared/collect-urls.js";
import { loadCache, saveCache, type Cache } from "../shared/cache.js";
import { touchMarkdownFiles } from "../shared/touch.js";
import { CARD_SHORTCODE_PATTERN } from "../shared/patterns.js";
import { extractMeta } from "./extract.js";
import { fetchPage, isImageUsable } from "./fetch-page.js";
import type { CardRecord } from "./types.js";

const TOUCH_PATTERN = /\{\{\s*card\s*\(/;

type CardCache = Cache<CardRecord>;

export interface RunOpts {
  baseDir: string;
  toolDir: string;
  refreshAll: boolean;
  refreshFailed: boolean;
}

async function processUrl(
  rawUrl: string,
  cache: CardCache,
  refreshAll: boolean,
  refreshFailed: boolean
): Promise<boolean> {
  const key = rawUrl;
  const existing = cache[key];

  // 手動メンテナンスエントリは refresh フラグに関係なく常にスキップ
  if (existing?.manual) {
    console.log(`  manual (skip): ${key}`);
    return false;
  }

  if (existing && existing.status === "ok" && !refreshAll) {
    console.log(`  cached: ${key}`);
    return false;
  }

  if (existing && existing.status === "failed" && !refreshFailed) {
    console.log(`  skip failed: ${key}`);
    return false;
  }

  console.log(`  fetch: ${key}`);
  try {
    const { finalUrl, html } = await fetchPage(key);
    const meta = extractMeta(html, finalUrl);

    let image = meta.imageUrl;
    if (image && !(await isImageUsable(image))) {
      console.log(`    image not usable (skip): ${image}`);
      image = undefined;
    }
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

export async function runCards(opts: RunOpts): Promise<void> {
  console.log("embed-gen[card]: fetch phase");
  const contentDir = join(opts.baseDir, "content");
  const cachePath = join(opts.toolDir, "cache/cards.json");

  const urls = collectUrls(contentDir, CARD_SHORTCODE_PATTERN);
  console.log(`  found ${urls.length} card URL(s) in content/`);

  const cache = loadCache<CardRecord>(cachePath);
  let mutated = false;

  for (const url of urls) {
    try {
      if (await processUrl(url, cache, opts.refreshAll, opts.refreshFailed))
        mutated = true;
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

  saveCache(cachePath, cache);
  console.log(`  wrote ${cachePath}`);

  if (mutated) {
    const touched = touchMarkdownFiles(contentDir, TOUCH_PATTERN);
    if (touched > 0) {
      console.log(`  touched ${touched} markdown file(s) for zola serve reload`);
    }
  }
}
