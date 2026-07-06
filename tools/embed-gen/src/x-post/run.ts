import { join } from "path";
import { collectUrls } from "../shared/collect-urls.js";
import { loadCache, saveCache, type Cache } from "../shared/cache.js";
import { touchMarkdownFiles } from "../shared/touch.js";
import { XPOST_SHORTCODE_PATTERN } from "../shared/patterns.js";
import { fetchOEmbed } from "./fetch-oembed.js";
import type { PostRecord } from "./types.js";

const TOUCH_PATTERN = /\{\{\s*x_post\s*\(/;

type PostCache = Cache<PostRecord>;

export interface RunOpts {
  baseDir: string;
  toolDir: string;
  refreshAll: boolean;
  refreshFailed: boolean;
}

async function processUrl(
  rawUrl: string,
  cache: PostCache,
  refreshAll: boolean,
  refreshFailed: boolean
): Promise<boolean> {
  const key = rawUrl;
  const existing = cache[key];

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
    const oembed = await fetchOEmbed(key);
    cache[key] = {
      url: key,
      status: "ok",
      fetchedAt: new Date().toISOString(),
      html: oembed.html,
      authorName: oembed.author_name,
      authorUrl: oembed.author_url,
    };
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

function pruneOrphanCacheKeys(cache: PostCache, urls: string[]): number {
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

export async function runXPosts(opts: RunOpts): Promise<void> {
  console.log("embed-gen[x-post]: fetch phase");
  const contentDir = join(opts.baseDir, "content");
  const cachePath = join(opts.toolDir, "cache/posts.json");

  const urls = collectUrls(contentDir, XPOST_SHORTCODE_PATTERN);
  console.log(`  found ${urls.length} x_post URL(s) in content/`);

  const cache = loadCache<PostRecord>(cachePath);
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
