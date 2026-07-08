/**
 * Block requests to private / loopback addresses to prevent SSRF.
 * Note: this check operates on the supplied hostname string only.
 * DNS-rebinding attacks (a public domain resolving to a private IP) are not
 * mitigated here; users with sensitive internal infrastructure should deploy
 * this service in an isolated network or add a DNS-based egress firewall.
 */
export function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    // RFC-1918 ranges (simple prefix check – good enough for a server-side guard)
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    (lower.startsWith("172.") && /^172\.(1[6-9]|2\d|3[01])\./.test(lower)) ||
    lower.startsWith("169.254.") // link-local
  );
}
