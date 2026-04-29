import { createHash } from "crypto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { extname, join } from "path";

const USER_AGENT =
  "Mozilla/5.0 (compatible; notes-link-card-bot/1.0; +https://notes.januswel.com/)";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_ASSET_BYTES = 2 * 1024 * 1024; // 2 MB

export interface FetchedPage {
  finalUrl: string;
  html: string;
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ja,en;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!/html/i.test(contentType) && !/xml/i.test(contentType)) {
    throw new Error(`unexpected content-type: ${contentType}`);
  }
  const html = await res.text();
  return { finalUrl: res.url || url, html };
}

/**
 * リモートアセット（og:image / favicon）をローカル `static/link-cards/` に保存する。
 * 戻り値はサイトルート起点の絶対パス（例: `/link-cards/abcd1234.png`）。
 * 失敗時は undefined。
 */
export async function downloadAsset(
  assetUrl: string,
  outDir: string,
  publicPrefix: string
): Promise<string | undefined> {
  try {
    const res = await fetch(assetUrl, {
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return undefined;

    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > MAX_ASSET_BYTES) return undefined;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_ASSET_BYTES) return undefined;

    const ext = pickExtension(assetUrl, res.headers.get("content-type") ?? "");
    const hash = createHash("sha1").update(assetUrl).digest("hex").slice(0, 16);
    const filename = `${hash}${ext}`;

    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, filename);
    writeFileSync(outPath, buf);

    return `${publicPrefix}/${filename}`;
  } catch {
    return undefined;
  }
}

export function assetExists(
  outDir: string,
  publicPath: string | undefined
): boolean {
  if (!publicPath) return false;
  const filename = publicPath.split("/").pop();
  if (!filename) return false;
  return existsSync(join(outDir, filename));
}

function pickExtension(url: string, contentType: string): string {
  const ctMap: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
  };
  const ct = contentType.split(";")[0].trim().toLowerCase();
  if (ctMap[ct]) return ctMap[ct];

  try {
    const u = new URL(url);
    const ext = extname(u.pathname).toLowerCase();
    if (ext && ext.length <= 5) return ext;
  } catch {
    // ignore
  }
  return ".bin";
}
