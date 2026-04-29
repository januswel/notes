import { resolve } from "path";
import { runCards } from "./card/run.js";
import { runXPosts } from "./x-post/run.js";
import { runPreprocess, runWatcher } from "./preprocess/run.js";

const toolDir = resolve(import.meta.dirname, "..");
const baseDir = resolve(toolDir, "../..");

const args = new Set(process.argv.slice(2));
const watchMode = args.has("--watch");
const refreshAll = args.has("--refresh");
const refreshFailed = refreshAll || args.has("--refresh-failed");

const srcDir = resolve(baseDir, "src");
const contentDir = resolve(baseDir, "content");

async function main() {
  if (watchMode) {
    await runWatcher({ srcDir, outDir: contentDir });
    return;
  }
  await runPreprocess({ srcDir, outDir: contentDir });
  await runCards({ baseDir, toolDir, refreshAll, refreshFailed });
  await runXPosts({ baseDir, toolDir, refreshAll, refreshFailed });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
