const MAX_CONTENT_LENGTH = 1_000_000; // 1MB of extracted text

export type ExtractionResult = {
  text: string;
  truncated: boolean;
};

// Named group used in all content-region patterns
const CONTENT_GROUP = "content";

// Module-level pre-compiled patterns for content-region detection
const RE_MAIN    = new RegExp(`<main(\\s[^>]*)?>(?<${CONTENT_GROUP}>[\\s\\S]*?)<\\/main>`, "i");
const RE_ARTICLE = new RegExp(`<article(\\s[^>]*)?>(?<${CONTENT_GROUP}>[\\s\\S]*?)<\\/article>`, "i");
const RE_ROLE    = new RegExp(`role=["']main["'][^>]*>(?<${CONTENT_GROUP}>[\\s\\S]*?)<\\/[^>]+>`, "i");
const RE_DIV_ID  = new RegExp(`<div[^>]+id=["'](?:content|main|docs|documentation)["'][^>]*>(?<${CONTENT_GROUP}>[\\s\\S]*?)<\\/div>`, "i");

// Pre-compiled patterns for noisy element removal, keyed by tag name
const BLOCK_TAGS = ["script", "style", "nav", "header", "footer", "aside", "noscript"] as const;
type BlockTag = typeof BLOCK_TAGS[number];
const RE_BLOCK_SUBTREE: Record<BlockTag, RegExp> = Object.fromEntries(
  BLOCK_TAGS.map((tag) => [tag, new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi")])
) as Record<BlockTag, RegExp>;
const RE_BLOCK_ORPHAN: Record<BlockTag, RegExp> = Object.fromEntries(
  BLOCK_TAGS.map((tag) => [tag, new RegExp(`<\\/?${tag}(\\s[^>]*)?>`, "gi")])
) as Record<BlockTag, RegExp>;

/**
 * Extract readable text from an HTML string.
 * Prioritises <main> / <article> / role="main" when present, then falls back
 * to the full <body>.  Strips scripts, styles, nav, header, footer, and all
 * remaining tags before cleaning up whitespace.
 *
 * The returned string is plain text for storage and indexing — it is never
 * rendered as HTML.
 */
export function extractTextFromHtml(html: string): string {
  // ── 1. Pull out a focused content region ────────────────────────────────
  const mainMatch =
    RE_MAIN.exec(html) ??
    RE_ARTICLE.exec(html) ??
    RE_ROLE.exec(html) ??
    RE_DIV_ID.exec(html);

  // Use the named 'content' group (inner content), falling back to full document
  let content: string = mainMatch?.groups?.[CONTENT_GROUP] ?? html;

  // ── 2. Remove entire noisy element subtrees ──────────────────────────────
  // Each pair of patterns handles: complete <tag>…</tag> blocks and orphan tags.
  for (const tag of BLOCK_TAGS) {
    // RegExp.exec() with the `g` flag keeps state — reset lastIndex before reuse
    RE_BLOCK_SUBTREE[tag].lastIndex = 0;
    RE_BLOCK_ORPHAN[tag].lastIndex = 0;
    content = content.replace(RE_BLOCK_SUBTREE[tag], " ");
    content = content.replace(RE_BLOCK_ORPHAN[tag], " ");
  }

  // ── 3. Preserve blank lines around block-level elements ──────────────────
  content = content.replace(/<\/?(p|div|section|h[1-6]|li|tr|br)(\s[^>]*)?>/gi, "\n");

  // ── 4. Strip all remaining HTML tags, including incomplete/truncated ones ─
  // The `>?` makes the closing angle-bracket optional so that a fragment like
  // `<script incomplete` (e.g. from a truncated response) is also removed.
  content = content.replace(/<[^>]*>?/g, "");

  // ── 5. Decode common HTML entities (&amp; last to avoid double-decode) ───
  content = content
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&"); // must be last

  // ── 6. Normalise whitespace ──────────────────────────────────────────────
  content = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return content.trim();
}

/**
 * Extract searchable text content from supported file types.
 * Returns null for unsupported types (images, DOC/DOCX).
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult | null> {
  let raw: string | null = null;

  switch (mimeType) {
    case "text/plain":
    case "text/markdown": {
      raw = new TextDecoder("utf-8").decode(buffer);
      break;
    }
    case "application/pdf": {
      try {
        // Lazy require to avoid pdf-parse loading a test file at import time
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse/lib/pdf-parse.js");
        const result = await pdfParse(buffer);
        raw = result.text;
      } catch (err) {
        console.error("PDF text extraction failed:", err);
        return null;
      }
      break;
    }
    default:
      return null;
  }

  if (!raw || raw.trim().length === 0) {
    return null;
  }

  const truncated = raw.length > MAX_CONTENT_LENGTH;
  const text = truncated ? raw.slice(0, MAX_CONTENT_LENGTH) : raw;

  return { text, truncated };
}
