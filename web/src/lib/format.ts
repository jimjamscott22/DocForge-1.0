/**
 * Human-readable byte size, e.g. 1536 → "1.5 KB".
 * Returns "—" for null / zero / negative sizes.
 * Uses one decimal place below 10 of a unit, none at or above.
 */
export const formatBytes = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};
