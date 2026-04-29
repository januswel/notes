export type PostStatus = "ok" | "failed";

export interface PostRecord {
  url: string;
  status: PostStatus;
  fetchedAt: string;
  /** oEmbed の html フィールド (omit_script=1 のため <script> タグは含まない) */
  html?: string;
  authorName?: string;
  authorUrl?: string;
  error?: string;
}
