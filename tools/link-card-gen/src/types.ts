export type CardStatus = "ok" | "failed";

export interface CardRecord {
  url: string;
  status: CardStatus;
  fetchedAt: string;
  finalUrl?: string;
  title?: string;
  description?: string;
  siteName?: string;
  /** /link-cards/<sha1>.<ext> 形式の絶対パス（サイトルート起点）。なければ未設定 */
  image?: string;
  error?: string;
}

export type CardCache = Record<string, CardRecord>;
