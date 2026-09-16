/** File-type classification derived from a storage path / file name. */

export type FileFilterOption = "all" | "pdf" | "img" | "txt" | "doc" | "other";

/** Lowercased extension without the dot, or "" when there is none. */
export const getFileExtension = (path: string): string => {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

/** Extensions belonging to each filterable category. Also the source used to
 * build the matching SQL filter (see documentQuery.ts) — keep in sync. */
export const FILE_TYPE_EXTENSIONS: Record<Exclude<FileFilterOption, "all" | "other">, string[]> = {
  pdf: ["pdf"],
  img: ["png", "jpg", "jpeg", "gif"],
  txt: ["md", "txt"],
  doc: ["doc", "docx"],
};

/** Every extension covered by a known category, i.e. not "other". */
export const CLASSIFIED_EXTENSIONS: string[] = Object.values(FILE_TYPE_EXTENSIONS).flat();

/**
 * Map an extension to its category. The caller supplies the label used for
 * anything that doesn't match a known group ("other" for filtering UI,
 * "file" for icon rendering).
 */
const classify = (ext: string, fallback: string): string => {
  for (const [type, extensions] of Object.entries(FILE_TYPE_EXTENSIONS)) {
    if (extensions.includes(ext)) return type;
  }
  return fallback;
};

/** Category used by the file-type filter dropdown (unknown → "other"). */
export const getFileTypeFromPath = (path: string): FileFilterOption =>
  classify(getFileExtension(path), "other") as FileFilterOption;

/** Category used to pick a file-type icon (unknown → "file"). */
export const getFileIcon = (path: string): string =>
  classify(getFileExtension(path), "file");
