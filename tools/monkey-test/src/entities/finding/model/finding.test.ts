import { Array as Arr, String as Str, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { findingOf, lineOf, sortedFindings } from "./finding.ts";

const LONG_DETAIL = 400;
const MAX_LINE_DETAIL = 240;

describe("finding", () => {
  it("puts a finding on one line and cuts a long detail", () => {
    const detail = `first\n  second ${pipe("x", Str.repeat(LONG_DETAIL))}`;
    const found = findingOf({ kind: "cli-crash", target: "y8", detail });
    expect(lineOf(found)).not.toContain("\n");
    expect(found.detail).toHaveLength(MAX_LINE_DETAIL);
  });

  it("drops repeats and sorts by line", () => {
    const sorted = sortedFindings([
      { kind: "cli-hang", target: "b", detail: "one" },
      { kind: "cli-hang", target: "a", detail: "one" },
      { kind: "cli-hang", target: "b", detail: "one" },
    ]);
    expect(
      pipe(
        sorted,
        Arr.map((found) => lineOf(found)),
      ),
    ).toStrictEqual(["cli-hang a one", "cli-hang b one"]);
  });
});
