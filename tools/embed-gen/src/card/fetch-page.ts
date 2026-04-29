const USER_AGENT =
  "Mozilla/5.0 (compatible; notes-link-card-bot/1.0; +https://notes.januswel.com/)";
const FETCH_TIMEOUT_MS = 15_000;

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

export async function isImageUsable(imageUrl: string): Promise<boolean> {
  try {
    const res = await fetch(imageUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    // HEAD が 200 でも HTML エラーページや別形式が返ることがあるので、
    // ブラウザの <img> で表示できる形式に絞る。
    if (!ct.startsWith("image/")) return false;
    const corp = (res.headers.get("cross-origin-resource-policy") ?? "").toLowerCase();
    // CORP same-origin/same-site はブラウザが cross-origin の <img> 読み込みを
    // ブロックする。referrerpolicy では回避不可（Referer ベースではないため）。
    if (corp === "same-origin" || corp === "same-site") return false;
    return true;
  } catch {
    return false;
  }
}
