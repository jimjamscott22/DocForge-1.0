export type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "size_desc" | "size_asc";

export type SortableDocument = {
  title: string;
  file_size_bytes: number | null;
  created_at: string;
};

export function sortDocuments<T extends SortableDocument>(documents: T[], sort: SortOption): T[] {
  const sorted = [...documents];

  sorted.sort((a, b) => {
    switch (sort) {
      case "date_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "date_desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "name_asc":
        return a.title.localeCompare(b.title);
      case "name_desc":
        return b.title.localeCompare(a.title);
      case "size_asc":
        return (a.file_size_bytes ?? 0) - (b.file_size_bytes ?? 0);
      case "size_desc":
        return (b.file_size_bytes ?? 0) - (a.file_size_bytes ?? 0);
      default:
        return 0;
    }
  });

  return sorted;
}
