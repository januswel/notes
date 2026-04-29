import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export type Cache<T> = Record<string, T>;

export function loadCache<T>(path: string): Cache<T> {
  try {
    const text = readFileSync(path, "utf-8");
    return JSON.parse(text) as Cache<T>;
  } catch {
    return {};
  }
}

export function saveCache<T>(path: string, cache: Cache<T>): void {
  mkdirSync(dirname(path), { recursive: true });
  const sorted: Cache<T> = {};
  for (const key of Object.keys(cache).sort()) {
    sorted[key] = cache[key];
  }
  writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}
