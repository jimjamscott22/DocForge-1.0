import test from "node:test";
import assert from "node:assert/strict";
import { isBlockedHostname } from "./urlSafety";

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
