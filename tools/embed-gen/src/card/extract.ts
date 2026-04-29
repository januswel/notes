import * as cheerio from "cheerio";

export interface ExtractedMeta {
  title?: string;
  description?: string;
  siteName?: string;
  imageUrl?: string;
}

/**
 * HTML 文字列から OG / Twitter / 標準メタを抜き出す。
 * 画像 URL は absolute に解決済みで返す。
 */
export function extractMeta(html: string, baseUrl: string): ExtractedMeta {
  const $ = cheerio.load(html);

  const meta = (selector: string): string | undefined => {
    const v = $(selector).attr("content")?.trim();
    return v && v.length > 0 ? v : undefined;
  };

  const titleTag = $("title").first().text().trim() || undefined;
  const title =
    meta('meta[property="og:title"]') ??
    meta('meta[name="twitter:title"]') ??
    titleTag;

  const description =
    meta('meta[property="og:description"]') ??
    meta('meta[name="twitter:description"]') ??
    meta('meta[name="description"]');

  const siteName = meta('meta[property="og:site_name"]');

  const ogImage =
    meta('meta[property="og:image"]') ??
    meta('meta[property="og:image:url"]') ??
    meta('meta[name="twitter:image"]') ??
    meta('meta[name="twitter:image:src"]');

  let imageUrl: string | undefined;
  if (ogImage) {
    try {
      imageUrl = new URL(ogImage, baseUrl).toString();
    } catch {
      // ignore
    }
  }

  return {
    title: title?.trim() || undefined,
    description: description?.trim() || undefined,
    siteName: siteName?.trim() || undefined,
    imageUrl,
  };
}
