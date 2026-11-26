import { lookup } from "node:dns";
import { get as httpGet, type IncomingMessage } from "node:http";
import { get as httpsGet } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

const nonPublicIPv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) {
  nonPublicIPv4.addSubnet(network, prefix);
}

const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");
const nonPublicIPv6 = new BlockList();
for (const [network, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
] as const) {
  nonPublicIPv6.addSubnet(network, prefix, "ipv6");
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !nonPublicIPv4.check(address);
  return family === 6
    && !address.includes("%")
    && globalIPv6.check(address, "ipv6")
    && !nonPublicIPv6.check(address, "ipv6");
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (isIP(host)) return !isPublicAddress(host);
  return !host.includes(".") || host.endsWith(".localhost") || host.endsWith(".local");
}

const lookupPublicAddress: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true, family: options.family }, (error, addresses) => {
    if (error) {
      callback(error, "", 0);
      return;
    }
    const [first] = addresses;
    if (!first || addresses.some(({ address }) => !isPublicAddress(address))) {
      callback(new Error("The hostname must resolve to public addresses"), "", 0);
      return;
    }

    // Supply these same validated addresses directly to the socket.
    if (options.all) {
      callback(null, addresses);
      return;
    }
    callback(null, first.address, first.family);
  });
};

// Preserve Fetch's port restrictions when using Node's HTTP client.
const BLOCKED_PORTS = new Set([
  0, 1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77,
  79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135,
  137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531,
  532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720,
  1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668,
  6669, 6679, 6697, 10080,
]);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 20;

export async function fetchPublicHtml(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  let current = url;
  for (let redirects = 0; ; redirects++) {
    if (
      (current.protocol !== "http:" && current.protocol !== "https:")
      || current.username || current.password || isBlockedHostname(current.hostname)
      || (current.port !== "" && BLOCKED_PORTS.has(Number(current.port)))
    ) {
      throw new Error("The import destination must be a public HTTP(S) URL");
    }

    const get = current.protocol === "https:" ? httpsGet : httpGet;
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = get(current, {
        agent: false,
        lookup: lookupPublicAddress,
        signal,
        headers: {
          "User-Agent": "DocForge/1.0 (document importer)",
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Encoding": "identity",
        },
      }, resolve);
      request.once("error", reject);
    });

    const location = response.headers.location;
    if (!location || !REDIRECT_STATUSES.has(response.statusCode ?? 0)) return response;
    response.destroy();
    if (redirects === MAX_REDIRECTS) throw new Error("Too many redirects");
    current = new URL(location, current);
  }
}
