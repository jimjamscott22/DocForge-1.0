import test from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  resolveFileMimeType,
} from "./uploadMime";

test("keeps specific MIME types as-is", () => {
  const resolved = resolveFileMimeType({
    name: "notes.txt",
    type: "text/plain",
  });

  assert.equal(resolved, "text/plain");
});

test("falls back to extension for application/octet-stream", () => {
  const resolved = resolveFileMimeType({
    name: "manual.pdf",
    type: "application/octet-stream",
  });

  assert.equal(resolved, "application/pdf");
});

test("falls back to extension for uppercase file names", () => {
  const resolved = resolveFileMimeType({
    name: "SCAN.JPG",
    type: "application/octet-stream",
  });

  assert.equal(resolved, "image/jpeg");
});

test("returns generic MIME for unknown extension", () => {
  const resolved = resolveFileMimeType({
    name: "archive.bin",
    type: "application/octet-stream",
  });

  assert.equal(resolved, "application/octet-stream");
});

test("resolved octet-stream PDF is allowed", () => {
  const resolved = resolveFileMimeType({
    name: "contract.pdf",
    type: "application/octet-stream",
  });

  assert.ok(ALLOWED_UPLOAD_MIME_TYPES.includes(resolved));
});
