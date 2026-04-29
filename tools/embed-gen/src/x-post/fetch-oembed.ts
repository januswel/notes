const USER_AGENT =
  "Mozilla/5.0 (compatible; notes-x-embed-bot/1.0; +https://notes.januswel.com/)";
const FETCH_TIMEOUT_MS = 15_000;
const OEMBED_BASE = "https://publish.twitter.com/oembed";

export interface OEmbedResponse {
  url?: string;
  author_name?: string;
  author_url?: string;
  html?: string;
  type?: string;
  provider_name?: string;
}

export async function fetchOEmbed(postUrl: string): Promise<OEmbedResponse> {
  const params = new URLSearchParams({
    url: postUrl,
    omit_script: "1",
    dnt: "true",
    hide_thread: "true",
    lang: "ja",
  });
  const res = await fetch(`${OEMBED_BASE}?${params.toString()}`, {
    redirect: "follow",
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as OEmbedResponse;
  if (!json.html) {
    throw new Error("oEmbed response missing html");
  }
  return json;
}
