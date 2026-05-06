const MAX_CONTENT_LENGTH = 1_000_000; // 1MB of extracted text

export type ExtractionResult = {
  text: string;
  truncated: boolean;
};

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
  const CONTENT_GROUP = "content";
  const mainMatch =
    new RegExp(`<main(\\s[^>]*)?>(?<${CONTENT_GROUP}>[\\s\\S]*?)<\\/main>`, "i").exec(html) ??
    new RegExp(`<article(\\s[^>]*)?>(?<${CONTENT_GROUP}>[\\s\\S]*?)<\\/article>`, "i").exec(html) ??
    new RegExp(`role=["']main["'][^>]*>(?<${CONTENT_GROUP}>[\\s\\S]*?)<\\/[^>]+>`, "i").exec(html) ??
    new RegExp(`<div[^>]+id=["'](?:content|main|docs|documentation)["'][^>]*>(?<${CONTENT_GROUP}>[\\s\\S]*?)<\\/div>`, "i").exec(html);

  // Use the named 'content' group (inner content), falling back to full document
  let content: string = mainMatch?.groups?.[CONTENT_GROUP] ?? html;

  // ── 2. Remove entire noisy element subtrees ──────────────────────────────
  // Pattern handles: <tag>, <tag attr="val">, <tag/>, </tag>
  const blockTags = ["script", "style", "nav", "header", "footer", "aside", "noscript"];
  for (const tag of blockTags) {
    content = content.replace(
      new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi"),
      " "
    );
    // Strip any orphan open/close tags left behind (e.g. after truncation)
    content = content.replace(new RegExp(`<\\/?${tag}(\\s[^>]*)?>`, "gi"), " ");
  }

  // ── 3. Preserve blank lines around block-level elements ──────────────────
  content = content.replace(/<\/?(p|div|section|h[1-6]|li|tr|br)(\s[^>]*)?>/gi, "\n");

  // ── 4. Strip all remaining HTML tags ────────────────────────────────────
  content = content.replace(/<[^>]*>/g, "");
  // Belt-and-suspenders: remove any script/style remnants surviving general stripping
  content = content.replace(/<script[^>]*>/gi, "").replace(/<\/script>/gi, "");
  content = content.replace(/<style[^>]*>/gi, "").replace(/<\/style>/gi, "");
  // Clean up any unclosed tag fragment at end of buffer (e.g. a truncated page)
  content = content.replace(/<[^>]*$/, "");

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
