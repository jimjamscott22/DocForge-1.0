const MAX_CONTENT_LENGTH = 1_000_000; // 1MB of extracted text

export type ExtractionResult = {
  text: string;
  truncated: boolean;
};

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
        const pdfParse = require("pdf-parse");
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
