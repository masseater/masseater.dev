import { describe, expect, test } from "vite-plus/test";

import { format } from "./format.ts";

const BASE = {
  path: "docs/guide.md",
  line: 12,
  rule: "markdownlint/MD013",
  message: "Line length",
  severity: "error",
} as const;

describe("format", () => {
  test("prints path, line, column, severity, rule and message", () => {
    expect(format({ ...BASE, column: 81 })).toBe(
      "docs/guide.md:12:81 error markdownlint/MD013 Line length",
    );
  });

  test("leaves the column out when the rule reports a whole line", () => {
    expect(format(BASE)).toBe("docs/guide.md:12 error markdownlint/MD013 Line length");
  });

  test("appends detail and context in brackets and skips empty ones", () => {
    expect(format({ ...BASE, detail: "Expected: 80; Actual: 95", context: "" })).toBe(
      "docs/guide.md:12 error markdownlint/MD013 Line length [Expected: 80; Actual: 95]",
    );
    expect(format({ ...BASE, severity: "warn", detail: "a", context: "b" })).toBe(
      "docs/guide.md:12 warn markdownlint/MD013 Line length [a] [b]",
    );
  });
});
