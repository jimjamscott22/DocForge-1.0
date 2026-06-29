import test from "node:test";
import assert from "node:assert/strict";
import { getFileExtension, getFileTypeFromPath, getFileIcon } from "./fileType";

test("getFileExtension returns extension without dot", () => {
  assert.equal(getFileExtension("report.pdf"), "pdf");
});

test("getFileExtension lowercases the extension", () => {
  assert.equal(getFileExtension("SCAN.JPG"), "jpg");
});

test("getFileExtension returns empty string when no extension", () => {
  assert.equal(getFileExtension("noextension"), "");
});

test("getFileTypeFromPath classifies pdf", () => {
  assert.equal(getFileTypeFromPath("report.pdf"), "pdf");
});

test("getFileTypeFromPath classifies png as img", () => {
  assert.equal(getFileTypeFromPath("photo.png"), "img");
});

test("getFileTypeFromPath classifies jpg as img", () => {
  assert.equal(getFileTypeFromPath("photo.jpg"), "img");
});

test("getFileTypeFromPath classifies md as txt", () => {
  assert.equal(getFileTypeFromPath("notes.md"), "txt");
});

test("getFileTypeFromPath classifies txt as txt", () => {
  assert.equal(getFileTypeFromPath("readme.txt"), "txt");
});

test("getFileTypeFromPath classifies docx as doc", () => {
  assert.equal(getFileTypeFromPath("report.docx"), "doc");
});

test("getFileTypeFromPath returns other for unknown extension", () => {
  assert.equal(getFileTypeFromPath("archive.zip"), "other");
});

test("getFileIcon returns file for unknown extension", () => {
  assert.equal(getFileIcon("archive.zip"), "file");
});

test("getFileIcon returns pdf for pdf", () => {
  assert.equal(getFileIcon("report.pdf"), "pdf");
});

test("getFileIcon returns img for jpeg", () => {
  assert.equal(getFileIcon("photo.jpeg"), "img");
});
