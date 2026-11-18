import { describe, expect, test } from "vite-plus/test";

import { reportedSeverity } from "./severity.ts";

describe("reportedSeverity", () => {
  test("reports warn as warn and error as error", () => {
    expect(reportedSeverity({ severity: "warn", options: {} })).toBe("warn");
    expect(reportedSeverity({ severity: "error", options: {} })).toBe("error");
  });
});
