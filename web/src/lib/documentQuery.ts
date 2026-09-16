import { FILE_TYPE_EXTENSIONS, CLASSIFIED_EXTENSIONS, type FileFilterOption } from "./fileType";
import type { SortOption } from "./sortDocuments";

export const DOCUMENTS_PAGE_SIZE = 20;

export const SORT_COLUMNS: Record<string, string> = {
  date: "created_at",
  name: "title",
  size: "file_size_bytes",
};

/** Splits a SortOption like "name_desc" into its PostgREST order() args. */
export function toOrderArgs(sort: SortOption): { column: string; ascending: boolean } {
  const [field, direction] = sort.split("_") as [string, string];
  return { column: SORT_COLUMNS[field], ascending: direction === "asc" };
}

/**
 * Applies the file-type filter to a Supabase query builder for the `documents`
 * table, matching storage_path extensions the same way fileType.ts's
 * classify() does client-side. Returns the same builder for chaining.
 */
export function applyFileTypeFilter<T extends { or: (f: string) => T; not: (c: string, o: string, v: string) => T }>(
  query: T,
  fileType: FileFilterOption
): T {
  if (fileType === "all") return query;

  if (fileType === "other") {
    return CLASSIFIED_EXTENSIONS.reduce(
      (q, ext) => q.not("storage_path", "ilike", `%.${ext}`),
      query
    );
  }

  const extensions = FILE_TYPE_EXTENSIONS[fileType];
  return query.or(extensions.map((ext) => `storage_path.ilike.%.${ext}`).join(","));
}
