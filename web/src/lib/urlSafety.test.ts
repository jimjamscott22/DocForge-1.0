import test from "node:test";
import assert from "node:assert/strict";
import dns from "node:dns";
import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { fetchPublicHtml, isBlockedHostname } from "./urlSafety";

test("blocks localhost", () => {
  assert.equal(isBlockedHostname("localhost"), true);
  assert.equal(isBlockedHostname("LOCALHOST"), true);
});

test("blocks loopback addresses", () => {
  assert.equal(isBlockedHostname("127.0.0.1"), true);
  assert.equal(isBlockedHostname("::1"), true);
});

test("blocks .local hostnames", () => {
  assert.equal(isBlockedHostname("printer.local"), true);
});

test("blocks 10.x.x.x range", () => {
  assert.equal(isBlockedHostname("10.0.0.5"), true);
});

test("blocks 192.168.x.x range", () => {
  assert.equal(isBlockedHostname("192.168.1.1"), true);
});

test("blocks 172.16-31.x.x range", () => {
  assert.equal(isBlockedHostname("172.16.0.1"), true);
  assert.equal(isBlockedHostname("172.31.255.255"), true);
});

test("does not block 172.15.x.x or 172.32.x.x (outside RFC-1918 range)", () => {
  assert.equal(isBlockedHostname("172.15.0.1"), false);
  assert.equal(isBlockedHostname("172.32.0.1"), false);
});

test("blocks link-local 169.254.x.x", () => {
  assert.equal(isBlockedHostname("169.254.1.1"), true);
});

test("does not block public domains", () => {
  assert.equal(isBlockedHostname("example.com"), false);
  assert.equal(isBlockedHostname("docs.python.org"), false);
});

test("does not block public IPs", () => {
  assert.equal(isBlockedHostname("8.8.8.8"), false);
});

test("blocks non-public address families and local hostname suffixes", () => {
  for (const hostname of [
    "127.1.2.3", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    "[::1]", "[::ffff:127.0.0.1]", "[fc00::1]", "[fe80::1]", "[2002::1]",
    "localhost.", "printer.LOCAL.", "host.localhost",
  ]) {
    assert.equal(isBlockedHostname(hostname), true, hostname);
  }
  assert.equal(isBlockedHostname("[2606:4700:4700::1111]"), false);
  assert.equal(isBlockedHostname("10.example.com"), false);
});

test("validates DNS answers at connection time and checks each redirect", async (t) => {
  const destinations: string[] = [];
  const lookupMock = t.mock.method(dns, "lookup", (
    _host: string,
    _options: unknown,
    callback: (error: null, addresses: dns.LookupAddress[]) => void,
  ) => callback(null, [{ address: "8.8.8.8", family: 4 }]));

  const getMock = t.mock.method(https, "get", (
    url: URL,
    options: https.RequestOptions,
    respond: (response: IncomingMessage) => void,
  ) => {
    const request = new EventEmitter();
    queueMicrotask(() => {
      options.lookup!(url.hostname, { all: true }, (error, addresses) => {
        if (error) {
          request.emit("error", error);
          return;
        }
        const [address] = addresses as dns.LookupAddress[];
        destinations.push(address.address);
        respond({
          statusCode: 200,
          headers: { "content-type": "text/html" },
        } as IncomingMessage);
      });
    });
    return request;
  });
  syncBuiltinESMExports();
  try {
    const url = new URL("https://docs.example.com/");
    const signal = new AbortController().signal;
    assert.equal((await fetchPublicHtml(url, signal)).statusCode, 200);
    assert.deepEqual(destinations, ["8.8.8.8"]);
    assert.equal(lookupMock.mock.callCount(), 1);
    assert.equal((getMock.mock.calls[0].arguments[0] as URL).hostname, url.hostname);
    assert.equal(getMock.mock.calls[0].arguments[1].agent, false);

    lookupMock.mock.mockImplementation((
      _host: string,
      _options: unknown,
      callback: (error: null, addresses: dns.LookupAddress[]) => void,
    ) => callback(null, [{ address: "10.0.0.1", family: 4 }]));
    await assert.rejects(fetchPublicHtml(url, signal), /must resolve to public addresses/);
    assert.deepEqual(destinations, ["8.8.8.8"]);

    let destroyed = false;
    getMock.mock.mockImplementationOnce((_url: URL, _options: https.RequestOptions, respond: (response: IncomingMessage) => void) => {
      queueMicrotask(() => respond({
        statusCode: 302,
        headers: { location: "https://printer.local/docs" },
        destroy: () => { destroyed = true; },
      } as IncomingMessage));
      return new EventEmitter();
    });
    await assert.rejects(fetchPublicHtml(url, signal), /must be a public HTTP\(S\) URL/);
    assert.equal(destroyed, true);
    assert.equal(getMock.mock.callCount(), 3);
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});
