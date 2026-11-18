import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { executableOf, targetOf } from "./target.ts";

const TARGETS = ["linux-x64-gnu", "win32-x64-msvc"];

describe("native targets", () => {
  it("picks the declared target of the running platform", () => {
    expect([
      targetOf(TARGETS)("linux", "x64"),
      targetOf(TARGETS)("win32", "x64"),
      targetOf(TARGETS)("darwin", "arm64"),
    ]).toStrictEqual([Option.some("linux-x64-gnu"), Option.some("win32-x64-msvc"), Option.none()]);
  });

  it("adds the Windows executable extension", () => {
    expect([executableOf("tsrs")("linux"), executableOf("tsrs")("win32")]).toStrictEqual([
      "tsrs",
      "tsrs.exe",
    ]);
  });
});
