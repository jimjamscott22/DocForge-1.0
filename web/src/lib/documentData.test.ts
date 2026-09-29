import test from "node:test";
import assert from "node:assert/strict";
import { loadDocumentPage } from "./documentData";
import { buildFolderHref } from "./documentQuery";

const documents = Array.from({ length: 65 }, (_, i) => ({
  id: String(i).padStart(3, "0"),
  title: `Document ${i}`,
  storage_path: `${i}.txt`,
  file_size_bytes: i,
  created_at: String(i).padStart(3, "0"),
  created_by: "owner",
  folder_id: i < 40 ? "folder-a" : "folder-b",
}));

function client() {
  return {
    from() {
      let rows = documents;
      return {
        select() { return this; },
        eq(column: "created_by" | "folder_id", value: string) {
          rows = rows.filter((row) => row[column] === value);
          return this;
        },
        order() { return this; },
        async range(start: number, end: number) {
          return { data: rows.slice(start, end + 1), count: rows.length, error: null };
        },
      };
    },
    async rpc(_name: string, args: Record<string, unknown>) {
      const rows = documents.filter((row) =>
        row.created_by === args.user_id && (!args.p_folder_id || row.folder_id === args.p_folder_id)
      );
      const offset = Number(args.p_offset);
      return {
        data: rows.slice(offset, offset + Number(args.p_limit)).map((row) => ({ ...row, total_count: rows.length })),
        error: null,
      };
    },
  };
}

const options = { search: "", sort: "date_desc" as const, fileType: "all" as const, folderId: "folder-b", page: 1 };

test("folder pagination filters the entire vault before slicing the page", async () => {
  const result = await loadDocumentPage(client() as never, "owner", options);
  assert.equal(result.totalCount, 25);
  assert.equal(result.documents.length, 20);
  assert.equal(result.documents[0].id, "040");
  const next = await loadDocumentPage(client() as never, "owner", { ...options, page: 2 });
  assert.equal(next.documents.length, 5);
  assert.equal(next.documents[0].id, "060");
});

test("search pagination uses the selected folder and its total count", async () => {
  const result = await loadDocumentPage(client() as never, "owner", { ...options, search: "Document", page: 2 });
  assert.equal(result.totalCount, 25);
  assert.equal(result.documents.length, 5);
  assert.equal(result.documents[0].id, "060");
});

test("all documents includes every folder", async () => {
  const result = await loadDocumentPage(client() as never, "owner", { ...options, folderId: null });
  assert.equal(result.totalCount, 65);
});

test("an empty folder recovers to page one", async () => {
  const result = await loadDocumentPage(client() as never, "owner", { ...options, folderId: "empty", page: 3 });
  assert.deepEqual(result, { documents: [], totalCount: 0, page: 1 });
});

test("a list shrinking to one page fetches that page after an out-of-range request", async () => {
  const singlePage = {
    from() {
      const query = client().from();
      query.range = async (start, end) => ({ data: documents.slice(0, 5).slice(start, end + 1), count: 5, error: null });
      return query;
    },
  };
  const result = await loadDocumentPage(singlePage as never, "owner", { ...options, page: 2 });
  assert.equal(result.page, 1);
  assert.equal(result.documents.length, 5);
});

for (const search of ["", "Document"]) {
  test(`out-of-range ${search ? "search" : "list"} page recovers to the last page`, async () => {
    const result = await loadDocumentPage(client() as never, "owner", { ...options, search, page: 9 });
    assert.equal(result.page, 2);
    assert.equal(result.totalCount, 25);
    assert.equal(result.documents.length, 5);
  });
}

test("database errors are surfaced rather than displayed as an empty vault", async () => {
  const failing = { rpc: async () => ({ data: null, error: { message: "missing migration" } }) };
  await assert.rejects(loadDocumentPage(failing as never, "owner", { ...options, search: "Document" }), /missing migration/);
});

test("switching folders preserves filters, resets page, and leaves the input untouched", () => {
  const params = new URLSearchParams("q=hello&sort=name_asc&type=txt&env=staging&page=3&folder=old");
  assert.equal(buildFolderHref(params, "new"), "/?q=hello&sort=name_asc&type=txt&env=staging&folder=new");
  assert.equal(params.get("page"), "3");
  assert.equal(buildFolderHref(params, null), "/?q=hello&sort=name_asc&type=txt&env=staging");
  assert.equal(buildFolderHref(new URLSearchParams("folder=old&page=2"), null), "/");
});
