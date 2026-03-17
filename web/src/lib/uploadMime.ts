import path from "path";

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/gif",
];

const EXTENSION_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
};

export type UploadFileLike = {
  name: string;
  type: string;
};

export function resolveFileMimeType(file: UploadFileLike): string {
  // Some browsers/OS combinations provide generic MIME values for valid files.
  const normalizedType = file.type.trim().toLowerCase();
  if (
    normalizedType &&
    normalizedType !== "application/octet-stream" &&
    normalizedType !== "binary/octet-stream"
  ) {
    return normalizedType;
  }

  const extension = path.extname(file.name).toLowerCase();
  return EXTENSION_TO_MIME[extension] ?? normalizedType;
}
