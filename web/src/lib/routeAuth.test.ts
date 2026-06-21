import test from "node:test";
import assert from "node:assert/strict";
import { AppError, ErrorCode } from "./errors";
import { assertOwned, requireUser } from "./routeAuth";

test("requireUser throws a structured auth error when no session user exists", async () => {
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  };

  await assert.rejects(
    () => requireUser(supabase as never, "delete documents"),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.UNAUTHORIZED);
      assert.equal(error.userMessage, "You must be signed in to delete documents");
      return true;
    }
  );
});

test("assertOwned throws a structured auth error for non-owned records", () => {
  assert.throws(
    () => assertOwned({ created_by: "owner-1" }, "user-2", "delete this document"),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.UNAUTHORIZED);
      assert.equal(error.userMessage, "You do not have permission to delete this document");
      return true;
    }
  );
});
