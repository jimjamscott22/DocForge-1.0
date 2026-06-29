/** File-type classification derived from a storage path / file name. */

export type FileFilterOption = "all" | "pdf" | "img" | "txt" | "doc" | "other";

/** Lowercased extension without the dot, or "" when there is none. */
export const getFileExtension = (path: string): string => {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

/**
 * Map an extension to its category. The caller supplies the label used for
 * anything that doesn't match a known group ("other" for filtering UI,
 * "file" for icon rendering).
 */
const classify = (ext: string, fallback: string): string => {
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "img";
  if (["md", "txt"].includes(ext)) return "txt";
  if (["doc", "docx"].includes(ext)) return "doc";
  return fallback;
};

/** Category used by the file-type filter dropdown (unknown → "other"). */
export const getFileTypeFromPath = (path: string): FileFilterOption =>
  classify(getFileExtension(path), "other") as FileFilterOption;

/** Category used to pick a file-type icon (unknown → "file"). */
export const getFileIcon = (path: string): string =>
  classify(getFileExtension(path), "file");
