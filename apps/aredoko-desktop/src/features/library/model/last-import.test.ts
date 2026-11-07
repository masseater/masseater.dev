import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { NO_IMPORT, lastImportOf } from "./last-import.ts";

const PLACED = 3;
const NOTHING = Option.none();

describe("lastImportOf", () => {
  it("reports how many packages were placed", () => {
    expect(lastImportOf({ status: "success", data: PLACED, error: NOTHING })).toStrictEqual({
      status: "placed",
      packages: PLACED,
    });
  });

  it("reports the message of a failed import", () => {
    expect(
      lastImportOf({ status: "error", data: NOTHING, error: new Error("壊れた zip") }),
    ).toStrictEqual({ status: "failed", message: "壊れた zip" });
  });

  it("falls back to a fixed message for a failure that is not an error", () => {
    expect(lastImportOf({ status: "error", data: NOTHING, error: "boom" })).toStrictEqual({
      status: "failed",
      message: "取り込めませんでした",
    });
  });

  it("shows nothing before the first import and while one runs", () => {
    expect(lastImportOf({ status: "idle", data: NOTHING, error: NOTHING })).toStrictEqual(
      NO_IMPORT,
    );
    expect(lastImportOf({ status: "pending", data: NOTHING, error: NOTHING })).toStrictEqual({
      status: "pending",
    });
  });
});
