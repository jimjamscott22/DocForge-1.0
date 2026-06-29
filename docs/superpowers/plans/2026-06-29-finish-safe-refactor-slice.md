# Finish Safe Refactor Slice (#4 / #5 / #6 / #14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all remaining inline duplications of `BUCKET_NAME`, `formatBytes`/`formatFileSize`, and extension-extraction logic, and add unit-test coverage for the shared helpers.

**Architecture:** Three library files (`src/lib/storage.ts`, `src/lib/format.ts`, `src/lib/fileType.ts`) already exist and are partially adopted. This plan migrates the remaining callers and writes tests. No new abstractions; pure migration + tests.

**Tech Stack:** Next.js 16, TypeScript 5, Node.js built-in test runner (`tsx --test`)

## Global Constraints

- Test runner: `tsx --test src/**/*.test.ts` (already in `package.json` — no changes needed)
- Test style: Node.js built-in `node:test` + `node:assert/strict` — match `uploadMime.test.ts`
- No new dependencies
- Never import `@/lib/storage`, `@/lib/format`, or `@/lib/fileType` via relative paths in route files — always use the `@/lib/…` alias

---

## Task 1: Migrate inline `BUCKET_NAME` + `getFileExtension` in 5 route files

**Files:**
- Modify: `src/app/api/documents/[id]/content/route.ts`
- Modify: `src/app/api/documents/[id]/export/markdown/route.ts`
- Modify: `src/app/api/documents/[id]/export/pdf/route.ts`
- Modify: `src/app/api/documents/[id]/download/route.ts`
- Modify: `src/app/api/v1/documents/[id]/download/route.ts`

**Interfaces:**
- Consumes: `BUCKET_NAME` from `@/lib/storage`, `getFileExtension` from `@/lib/fileType`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Edit `src/app/api/documents/[id]/content/route.ts`**

  Replace the import block and the two inline usages:

  ```ts
  // Before (lines 1-16):
  import { NextResponse } from "next/server";
  import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
  import {
    NotFoundError,
    ServerError,
    ValidationError,
  } from "@/lib/errors";
  import { errorResponse, handleRouteError } from "@/lib/apiResponse";
  import { assertOwned, requireUser } from "@/lib/routeAuth";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  const BUCKET_NAME = "DocForgeVault";
  ```

  ```ts
  // After:
  import { NextResponse } from "next/server";
  import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
  import {
    NotFoundError,
    ServerError,
    ValidationError,
  } from "@/lib/errors";
  import { errorResponse, handleRouteError } from "@/lib/apiResponse";
  import { assertOwned, requireUser } from "@/lib/routeAuth";
  import { BUCKET_NAME } from "@/lib/storage";
  import { getFileExtension } from "@/lib/fileType";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  ```

  Then replace the inline extension extraction:

  ```ts
  // Before (line 39):
  const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "";
  ```

  ```ts
  // After:
  const ext = getFileExtension(doc.storage_path);
  ```

- [ ] **Step 2: Edit `src/app/api/documents/[id]/export/markdown/route.ts`**

  Replace the import block:

  ```ts
  // Before (lines 1-11):
  import { NextResponse } from "next/server";
  import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
  import { errorResponse, handleRouteError } from "@/lib/apiResponse";
  import { NotFoundError, ServerError, ValidationError } from "@/lib/errors";
  import { assertOwned, requireUser } from "@/lib/routeAuth";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  const BUCKET_NAME = "DocForgeVault";
  ```

  ```ts
  // After:
  import { NextResponse } from "next/server";
  import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
  import { errorResponse, handleRouteError } from "@/lib/apiResponse";
  import { NotFoundError, ServerError, ValidationError } from "@/lib/errors";
  import { assertOwned, requireUser } from "@/lib/routeAuth";
  import { BUCKET_NAME } from "@/lib/storage";
  import { getFileExtension } from "@/lib/fileType";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  ```

  Then replace the inline extension extraction:

  ```ts
  // Before (line 33):
  const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "";
  ```

  ```ts
  // After:
  const ext = getFileExtension(doc.storage_path);
  ```

- [ ] **Step 3: Edit `src/app/api/documents/[id]/export/pdf/route.ts`**

  Replace the import block:

  ```ts
  // Before (lines 1-11):
  import { NextResponse } from "next/server";
  import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
  import { errorResponse, handleRouteError } from "@/lib/apiResponse";
  import { NotFoundError, ServerError } from "@/lib/errors";
  import { assertOwned, requireUser } from "@/lib/routeAuth";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  const BUCKET_NAME = "DocForgeVault";
  ```

  ```ts
  // After:
  import { NextResponse } from "next/server";
  import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
  import { errorResponse, handleRouteError } from "@/lib/apiResponse";
  import { NotFoundError, ServerError } from "@/lib/errors";
  import { assertOwned, requireUser } from "@/lib/routeAuth";
  import { BUCKET_NAME } from "@/lib/storage";
  import { getFileExtension } from "@/lib/fileType";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  ```

  Then replace the inline extension extraction:

  ```ts
  // Before (line 34):
  const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "";
  ```

  ```ts
  // After:
  const ext = getFileExtension(doc.storage_path);
  ```

- [ ] **Step 4: Edit `src/app/api/documents/[id]/download/route.ts`** (BUCKET_NAME only — no extension logic)

  Replace the import block:

  ```ts
  // Before (lines 1-13):
  import { NextResponse } from "next/server";
  import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
  import {
    NotFoundError,
    ServerError,
  } from "@/lib/errors";
  import { errorResponse, handleRouteError } from "@/lib/apiResponse";
  import { assertOwned, requireUser } from "@/lib/routeAuth";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  const BUCKET_NAME = "DocForgeVault";
  ```

  ```ts
  // After:
  import { NextResponse } from "next/server";
  import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
  import {
    NotFoundError,
    ServerError,
  } from "@/lib/errors";
  import { errorResponse, handleRouteError } from "@/lib/apiResponse";
  import { assertOwned, requireUser } from "@/lib/routeAuth";
  import { BUCKET_NAME } from "@/lib/storage";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  ```

- [ ] **Step 5: Edit `src/app/api/v1/documents/[id]/download/route.ts`** (BUCKET_NAME only)

  Replace the import block:

  ```ts
  // Before (lines 1-9):
  import { NextRequest, NextResponse } from "next/server";
  import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
  import { authenticateApiKey } from "@/lib/apiKeyAuth";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  const BUCKET_NAME = "DocForgeVault";
  ```

  ```ts
  // After:
  import { NextRequest, NextResponse } from "next/server";
  import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
  import { authenticateApiKey } from "@/lib/apiKeyAuth";
  import { BUCKET_NAME } from "@/lib/storage";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  ```

- [ ] **Step 6: Build-check**

  Run from `web/`:
  ```bash
  npm run build 2>&1 | tail -20
  ```
  Expected: exits 0 with `Route (app)` table and no TypeScript errors.

- [ ] **Step 7: Commit**

  ```bash
  git add \
    src/app/api/documents/[id]/content/route.ts \
    src/app/api/documents/[id]/export/markdown/route.ts \
    src/app/api/documents/[id]/export/pdf/route.ts \
    src/app/api/documents/[id]/download/route.ts \
    src/app/api/v1/documents/[id]/download/route.ts
  git commit -m "refactor: finish BUCKET_NAME + getFileExtension migration in remaining routes"
  ```

---

## Task 2: Migrate `UploadForm.tsx` — replace `formatFileSize` + inline extension

**Files:**
- Modify: `src/components/UploadForm.tsx`

**Interfaces:**
- Consumes: `formatBytes` from `@/lib/format`, `getFileExtension` from `@/lib/fileType`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add imports to `src/components/UploadForm.tsx`**

  Replace the existing import block at the top of the file:

  ```ts
  // Before (lines 1-8):
  "use client";

  import { FormEvent, useState, useRef, DragEvent } from "react";
  import { useRouter } from "next/navigation";
  import { useToast } from "./ToastProvider";
  import { useErrorHandler } from "./ErrorProvider";
  import { parseApiError } from "@/lib/errors";
  import { Spinner } from "./Spinner";
  ```

  ```ts
  // After:
  "use client";

  import { FormEvent, useState, useRef, DragEvent } from "react";
  import { useRouter } from "next/navigation";
  import { useToast } from "./ToastProvider";
  import { useErrorHandler } from "./ErrorProvider";
  import { parseApiError } from "@/lib/errors";
  import { Spinner } from "./Spinner";
  import { formatBytes } from "@/lib/format";
  import { getFileExtension } from "@/lib/fileType";
  ```

- [ ] **Step 2: Remove inline `formatFileSize` function**

  Delete these lines (lines 36–40):

  ```ts
  // Remove:
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };
  ```

- [ ] **Step 3: Replace `formatFileSize` calls with `formatBytes`**

  Find the JSX that renders upload progress. It looks like:

  ```tsx
  // Before:
  <span className="font-mono">{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
  ```

  ```tsx
  // After:
  <span className="font-mono">{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
  ```

- [ ] **Step 4: Replace inline extension extraction in `validateFile`**

  ```ts
  // Before (line 43):
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  ```

  ```ts
  // After:
  const ext = "." + getFileExtension(file.name);
  ```

- [ ] **Step 5: Build-check**

  Run from `web/`:
  ```bash
  npm run build 2>&1 | tail -20
  ```
  Expected: exits 0, no TypeScript errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/UploadForm.tsx
  git commit -m "refactor: replace UploadForm's inline formatFileSize and extension logic with shared helpers"
  ```

---

## Task 3: Add unit tests for `format.ts` and `fileType.ts` (#14)

**Files:**
- Create: `src/lib/format.test.ts`
- Create: `src/lib/fileType.test.ts`

**Interfaces:**
- Consumes: `formatBytes` from `./format`, `getFileExtension / getFileTypeFromPath / getFileIcon` from `./fileType`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Write `src/lib/format.test.ts`**

  ```ts
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
  ```

- [ ] **Step 2: Run format tests to verify they pass**

  From `web/`:
  ```bash
  tsx --test src/lib/format.test.ts
  ```
  Expected: 8 passing, 0 failing.

- [ ] **Step 3: Write `src/lib/fileType.test.ts`**

  ```ts
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
  ```

- [ ] **Step 4: Run fileType tests to verify they pass**

  From `web/`:
  ```bash
  tsx --test src/lib/fileType.test.ts
  ```
  Expected: 13 passing, 0 failing.

- [ ] **Step 5: Run the full test suite**

  From `web/`:
  ```bash
  npm run test
  ```
  Expected: all tests pass (uploadMime + routeAuth + format + fileType).

- [ ] **Step 6: Commit**

  ```bash
  git add src/lib/format.test.ts src/lib/fileType.test.ts
  git commit -m "test: add unit tests for format and fileType helpers"
  ```

---

## Post-completion

Update `docs/REFACTORING.md`:
- Mark #4 ✅
- Mark #5 ✅
- Mark #6 ✅
- Mark #14 as 🔄 (partially done — pure functions covered; routes/components not yet)
- Add a changelog entry for today
