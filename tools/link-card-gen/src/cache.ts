import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { CardCache } from "./types.js";

export function loadCache(path: string): CardCache {
  try {
    const text = readFileSync(path, "utf-8");
    return JSON.parse(text) as CardCache;
  } catch {
    return {};
  }
}

export function saveCache(path: string, cache: CardCache): void {
  mkdirSync(dirname(path), { recursive: true });
  const sorted: CardCache = {};
  for (const key of Object.keys(cache).sort()) {
    sorted[key] = cache[key];
  }
  writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}
