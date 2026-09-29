import type { createSupabaseServerClient } from "./supabaseServerClient";
import { DOCUMENTS_PAGE_SIZE, applyFileTypeFilter, toOrderArgs } from "./documentQuery";
import type { FileFilterOption } from "./fileType";
import type { SortOption } from "./sortDocuments";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type DocumentRow = {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: string;
  folder_id: string | null;
};

type DocumentQueryOptions = {
  search: string;
  sort: SortOption;
  fileType: FileFilterOption;
  folderId: string | null;
  page: number;
};

/** The database applies ownership and folder/type filters before pagination. */
export async function loadDocumentPage(
  supabase: SupabaseServerClient,
  userId: string,
  options: DocumentQueryOptions
): Promise<{ documents: DocumentRow[]; totalCount: number; page: number }> {
  const fetchPage = async (page: number) => {
    const offset = (page - 1) * DOCUMENTS_PAGE_SIZE;
    if (options.search) {
      const { data, error } = await supabase.rpc("search_documents", {
        search_query: options.search,
        user_id: userId,
        p_sort: options.sort,
        p_file_type: options.fileType,
        p_limit: DOCUMENTS_PAGE_SIZE,
        p_offset: offset,
        p_folder_id: options.folderId,
      });
      if (error) throw new Error(`Failed to search documents: ${error.message}`);
      const rows = (data ?? []) as (DocumentRow & { total_count: number })[];
      return { documents: rows, totalCount: Number(rows[0]?.total_count ?? 0), page };
    }

    let query = applyFileTypeFilter(
      supabase.from("documents")
        .select("id,title,storage_path,file_size_bytes,created_at,folder_id", { count: "exact" })
        .eq("created_by", userId),
      options.fileType
    );
    if (options.folderId) query = query.eq("folder_id", options.folderId);
    const { column, ascending } = toOrderArgs(options.sort);
    const { data, error, count } = await query
      .order(column, { ascending })
      .order("id", { ascending: true })
      .range(offset, offset + DOCUMENTS_PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to load documents: ${error.message}`);
    return { documents: (data ?? []) as DocumentRow[], totalCount: count ?? 0, page };
  };

  const result = await fetchPage(options.page);
  if (options.page === 1 || result.documents.length > 0) return result;

  // A window count disappears with an empty search page. Fetch page one to
  // recover its count, then recover to the last page after deletions/stale URLs.
  const first = options.search ? await fetchPage(1) : { ...result, page: 1 };
  const lastPage = Math.max(1, Math.ceil(first.totalCount / DOCUMENTS_PAGE_SIZE));
  if (first.totalCount === 0 || (options.search && lastPage === 1)) return first;
  return fetchPage(lastPage);
}
