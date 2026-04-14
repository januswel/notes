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
  /** true の場合、--refresh / --refresh-failed 問わず常に fetch をスキップする。
   *  bot 対策で自動取得できないサイト向けに、手動でメタ情報をメンテナンスするエントリに使う。 */
  manual?: boolean;
}

export type CardCache = Record<string, CardRecord>;
