import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

/**
 * cache に変更があったとき、対象 shortcode を含む md ファイルに同じ内容を書き戻して
 * 「Data 変更」イベントを発火させる。zola serve が content 変更として検知し再レンダリングする。
 * 単なる mtime 更新（utimes）では Metadata イベントになり Zola serve が拾わないため、
 * writeFileSync で実体を書き直す必要がある。
 */
export function touchMarkdownFiles(contentDir: string, pattern: RegExp): number {
  const files = globSync(`${contentDir}/**/*.md`);
  let touched = 0;
  for (const file of files) {
    const text = readFileSync(file, "utf-8");
    if (pattern.test(text)) {
      writeFileSync(file, text, "utf-8");
      touched++;
    }
  }
  return touched;
}
