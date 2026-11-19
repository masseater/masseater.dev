import { describe, expect, test } from "vite-plus/test";

import { sortByPosition } from "./trace.ts";

describe("sortByPosition", () => {
  test("orders findings by path, then line, then column", () => {
    const found = [
      { path: "b.txt", line: 1, column: 1 },
      { path: "a.txt", line: 2, column: 1 },
      { path: "a.txt", line: 1, column: 9 },
      { path: "a.txt", line: 1, column: 3 },
    ];
    expect(sortByPosition(found)).toStrictEqual([
      { path: "a.txt", line: 1, column: 3 },
      { path: "a.txt", line: 1, column: 9 },
      { path: "a.txt", line: 2, column: 1 },
      { path: "b.txt", line: 1, column: 1 },
    ]);
  });

  test("puts a finding without a column before those on the same line with one", () => {
    const found = [
      { path: "a.txt", line: 1, column: 2 },
      { path: "a.txt", line: 1 },
    ];
    expect(sortByPosition(found)).toStrictEqual([
      { path: "a.txt", line: 1 },
      { path: "a.txt", line: 1, column: 2 },
    ]);
  });
});
