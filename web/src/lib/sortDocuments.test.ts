import test from "node:test";
import assert from "node:assert/strict";
import { sortDocuments, type SortableDocument } from "./sortDocuments";

const docs: SortableDocument[] = [
  { title: "Banana", file_size_bytes: 200, created_at: "2024-01-02T00:00:00Z" },
  { title: "apple", file_size_bytes: 100, created_at: "2024-01-03T00:00:00Z" },
  { title: "Cherry", file_size_bytes: null, created_at: "2024-01-01T00:00:00Z" },
];

test("date_desc sorts newest first", () => {
  const result = sortDocuments(docs, "date_desc").map((d) => d.title);
  assert.deepEqual(result, ["apple", "Banana", "Cherry"]);
});

test("date_asc sorts oldest first", () => {
  const result = sortDocuments(docs, "date_asc").map((d) => d.title);
  assert.deepEqual(result, ["Cherry", "Banana", "apple"]);
});

test("name_asc sorts case-insensitively A-Z", () => {
  const result = sortDocuments(docs, "name_asc").map((d) => d.title);
  assert.deepEqual(result, ["apple", "Banana", "Cherry"]);
});

test("name_desc sorts case-insensitively Z-A", () => {
  const result = sortDocuments(docs, "name_desc").map((d) => d.title);
  assert.deepEqual(result, ["Cherry", "Banana", "apple"]);
});

test("size_asc treats null size as zero", () => {
  const result = sortDocuments(docs, "size_asc").map((d) => d.title);
  assert.deepEqual(result, ["Cherry", "apple", "Banana"]);
});

test("size_desc treats null size as zero", () => {
  const result = sortDocuments(docs, "size_desc").map((d) => d.title);
  assert.deepEqual(result, ["Banana", "apple", "Cherry"]);
});

test("does not mutate the input array", () => {
  const original = [...docs];
  sortDocuments(docs, "name_asc");
  assert.deepEqual(docs, original);
});
