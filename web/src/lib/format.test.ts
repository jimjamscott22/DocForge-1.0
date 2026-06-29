import test from "node:test";
import assert from "node:assert/strict";
import { formatBytes } from "./format";

test("returns dash for null", () => {
  assert.equal(formatBytes(null), "—");
});

test("returns dash for zero", () => {
  assert.equal(formatBytes(0), "—");
});

test("returns dash for negative", () => {
  assert.equal(formatBytes(-1), "—");
});

test("formats bytes without decimal above 10", () => {
  assert.equal(formatBytes(512), "512 B");
});

test("formats kilobytes with one decimal below 10", () => {
  assert.equal(formatBytes(1536), "1.5 KB");
});

test("formats kilobytes without decimal at 10 or above", () => {
  assert.equal(formatBytes(10 * 1024), "10 KB");
});

test("formats megabytes", () => {
  assert.equal(formatBytes(1.5 * 1024 * 1024), "1.5 MB");
});

test("formats gigabytes", () => {
  assert.equal(formatBytes(2 * 1024 * 1024 * 1024), "2.0 GB");
});
