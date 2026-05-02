export type DocumentRow = {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: string;
  folder_id?: string | null;
};

export const formatBytes = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

export const getFileIcon = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "img";
  if (["md", "txt"].includes(ext)) return "txt";
  if (["doc", "docx"].includes(ext)) return "doc";
  return "file";
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));

export const FileTypeIcon = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    pdf: "text-red-400 bg-red-400/10",
    img: "text-violet-400 bg-violet-400/10",
    txt: "text-emerald-400 bg-emerald-400/10",
    doc: "text-blue-400 bg-blue-400/10",
    file: "text-stone-400 bg-stone-400/10",
  };

  const labels: Record<string, string> = {
    pdf: "PDF",
    img: "IMG",
    txt: "TXT",
    doc: "DOC",
    file: "FILE",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${colors[type]}`}
    >
      {labels[type]}
    </span>
  );
};
