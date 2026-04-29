import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  copyFileSync,
} from "fs";
import { join, relative, dirname, extname } from "path";
import { globSync } from "glob";
import chokidar from "chokidar";

const URL_LINE = /^https?:\/\/\S+$/;

function urlToShortcode(url: string): string {
  try {
    const { hostname } = new URL(url);
    if (hostname === "x.com" || hostname === "twitter.com") {
      return `{{ x_post(url="${url}") }}`;
    }
  } catch {
    // fall through
  }
  return `{{ card(url="${url}") }}`;
}

export function transformMd(text: string): string {
  const lines = text.split(/\r?\n/);
  let inFrontmatter = false;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    if (i === 0 && (raw === "+++" || raw === "---")) {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (raw === "+++" || raw === "---") inFrontmatter = false;
      continue;
    }
    if (/^```/.test(raw) || /^~~~/.test(raw)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    if (!URL_LINE.test(raw)) continue;

    const prev = i === 0 ? "" : lines[i - 1];
    const next = i === lines.length - 1 ? "" : lines[i + 1];
    if (prev.trim() !== "" || next.trim() !== "") continue;

    try {
      new URL(raw);
    } catch {
      continue;
    }

    lines[i] = urlToShortcode(raw);
  }

  return lines.join("\n");
}

function writeIfChanged(outPath: string, content: string): boolean {
  if (existsSync(outPath)) {
    const existing = readFileSync(outPath, "utf-8");
    if (existing === content) return false;
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, "utf-8");
  return true;
}

function copyIfChanged(srcPath: string, outPath: string): boolean {
  if (existsSync(outPath)) {
    const src = readFileSync(srcPath);
    const dst = readFileSync(outPath);
    if (src.equals(dst)) return false;
  }
  mkdirSync(dirname(outPath), { recursive: true });
  copyFileSync(srcPath, outPath);
  return true;
}

function processFile(srcPath: string, outPath: string): boolean {
  if (extname(srcPath) === ".md") {
    const text = readFileSync(srcPath, "utf-8");
    return writeIfChanged(outPath, transformMd(text));
  }
  return copyIfChanged(srcPath, outPath);
}

export interface PreprocessOpts {
  srcDir: string;
  outDir: string;
}

export async function runPreprocess(opts: PreprocessOpts): Promise<void> {
  console.log("embed-gen[preprocess]: sync src/ → content/");
  const { srcDir, outDir } = opts;

  const relPaths = new Set(
    globSync(`${srcDir}/**/*`, { nodir: true }).map((f) => relative(srcDir, f))
  );

  let modified = 0;

  for (const rel of relPaths) {
    if (processFile(join(srcDir, rel), join(outDir, rel))) {
      console.log(`  write: ${rel}`);
      modified++;
    }
  }

  for (const outPath of globSync(`${outDir}/**/*`, { nodir: true })) {
    const rel = relative(outDir, outPath);
    if (!relPaths.has(rel)) {
      rmSync(outPath);
      console.log(`  prune: ${rel}`);
      modified++;
    }
  }

  console.log(`  ${modified} file(s) updated`);
}

export async function runWatcher(opts: PreprocessOpts): Promise<void> {
  const { srcDir, outDir } = opts;

  // 起動時に一度同期して orphan 掃除 + content/ を完全な状態にしてから watch
  await runPreprocess(opts);

  console.log(`embed-gen[preprocess]: watching ${srcDir}`);

  const watcher = chokidar.watch(srcDir, {
    ignoreInitial: true,
    persistent: true,
  });

  function onFile(srcPath: string): void {
    try {
      const rel = relative(srcDir, srcPath);
      const outPath = join(outDir, rel);
      if (processFile(srcPath, outPath)) {
        console.log(`[preprocess] write: ${rel}`);
      }
    } catch (err) {
      console.error(`[preprocess] error for ${srcPath}:`, err);
    }
  }

  function onUnlink(srcPath: string): void {
    try {
      const rel = relative(srcDir, srcPath);
      const outPath = join(outDir, rel);
      if (existsSync(outPath)) {
        rmSync(outPath);
        console.log(`[preprocess] remove: ${rel}`);
      }
    } catch (err) {
      console.error(`[preprocess] error removing ${srcPath}:`, err);
    }
  }

  function onUnlinkDir(srcPath: string): void {
    try {
      const rel = relative(srcDir, srcPath);
      const outPath = join(outDir, rel);
      if (existsSync(outPath)) {
        rmSync(outPath, { recursive: true });
        console.log(`[preprocess] remove dir: ${rel}`);
      }
    } catch (err) {
      console.error(`[preprocess] error removing dir ${srcPath}:`, err);
    }
  }

  watcher.on("add", onFile);
  watcher.on("change", onFile);
  watcher.on("unlink", onUnlink);
  watcher.on("unlinkDir", onUnlinkDir);
  watcher.on("error", (err) => console.error("[preprocess] watcher error:", err));

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      void watcher.close().then(resolve);
    });
    process.on("SIGTERM", () => {
      void watcher.close().then(resolve);
    });
  });
}
