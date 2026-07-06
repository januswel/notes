/** `{{ card(url="...") }}` の URL 引数を捕捉する。 */
export const CARD_SHORTCODE_PATTERN =
  /\{\{\s*card\s*\(\s*url\s*=\s*"([^"]+)"\s*\)\s*\}\}/g;

/** `{{ x_post(url="...") }}` の URL 引数を捕捉する。 */
export const XPOST_SHORTCODE_PATTERN =
  /\{\{\s*x_post\s*\(\s*url\s*=\s*"([^"]+)"\s*\)\s*\}\}/g;
