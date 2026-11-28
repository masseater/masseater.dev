import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import type { ProcessResult } from "#/shared/lib/run-process.ts";

import { findingOfRun, hasCrashSign, probesOf } from "./probes.ts";
import type { Probe, ProbeName } from "./probes.ts";

const OK = 0;
const FAILED = 1;
const USAGE_ERROR = 2;

const probeOf = (name: ProbeName): Probe => ({ name, args: [] });

const exited = (code: number, output: string): ProcessResult => ({
  exit: Option.some(code),
  output,
});

const kindOf = (name: ProbeName, result: ProcessResult): Option.Option<string> =>
  pipe(
    findingOfRun({ target: "tool@1.0.0 tool", probe: probeOf(name), result }),
    Option.map(({ kind }) => kind),
  );

describe("hasCrashSign", () => {
  it("sees a stack trace and a missing module", () => {
    expect(hasCrashSign("Error: boom\n    at run (file:///tool/bin.mjs:3:9)")).toBe(true);
    expect(hasCrashSign("Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite'")).toBe(true);
    expect(hasCrashSign("Usage: tool [options]")).toBe(false);
  });
});

describe("findingOfRun", () => {
  it("accepts a help and a version however they answer", () => {
    expect(kindOf("help", exited(OK, ""))).toStrictEqual(Option.none());
    expect(kindOf("version", exited(USAGE_ERROR, "unknown option"))).toStrictEqual(Option.none());
  });

  it("reports a bin that cannot start", () => {
    const crashed = exited(FAILED, "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite'");
    expect(kindOf("help", crashed)).toStrictEqual(Option.some("cli-startup"));
  });

  it("reports a help that answers with a stack trace", () => {
    const failed = exited(
      FAILED,
      "H56mError: not a git repository\n    at run (file:///tool/bin.mjs:3:9)",
    );
    expect(kindOf("help", failed)).toStrictEqual(Option.some("cli-crash"));
  });

  it("accepts a clean refusal and reports a stack trace on odd input", () => {
    expect(kindOf("unknown-flag", exited(USAGE_ERROR, "unknown option"))).toStrictEqual(
      Option.none(),
    );
    expect(kindOf("garbage", exited(FAILED, "TypeError: bad\n    at x (y.js:1:2)"))).toStrictEqual(
      Option.some("cli-crash"),
    );
  });

  it("reports a probe that never exits", () => {
    expect(kindOf("bad-bytes", { exit: Option.none(), output: "" })).toStrictEqual(
      Option.some("cli-hang"),
    );
  });
});

describe("probesOf", () => {
  it("hands the bad-bytes probe the work directory", () => {
    const names = pipe(
      probesOf("/work"),
      Arr.map(({ name }) => name),
    );
    expect(names).toContain("bad-bytes");
  });
});
