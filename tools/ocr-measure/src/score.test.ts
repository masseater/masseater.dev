import { describe, expect, it } from "vite-plus/test";

import { isCorrect } from "./score.ts";

const found = (text: string) => ({ status: "found", text }) as const;

describe("isCorrect", () => {
  it("accepts an amount inside the chosen line", () => {
    expect(
      isCorrect({ field: "total", value: found(String.raw`合計 \15,867`), truth: "¥15,867" }),
    ).toBe(true);
  });

  it("accepts an amount with a space after the comma", () => {
    expect(
      isCorrect({ field: "total", value: found(String.raw`合計 \18, 103`), truth: "¥18,103" }),
    ).toBe(true);
  });

  it("rejects an amount read with the wrong digits", () => {
    expect(
      isCorrect({ field: "total", value: found(String.raw`合計 \15,861`), truth: "¥15,867" }),
    ).toBe(false);
  });

  it("accepts a date written in another style", () => {
    expect(
      isCorrect({ field: "issueDate", value: found("令和8年10月8日"), truth: "2026-10-08" }),
    ).toBe(true);
  });
});

describe("isCorrect for dates", () => {
  it("keeps the date apart from the time after a space", () => {
    expect(
      isCorrect({ field: "issueDate", value: found("2026/10/02 14:02"), truth: "2026/10/02" }),
    ).toBe(true);
  });

  it("rejects a date with a broken day", () => {
    expect(
      isCorrect({ field: "issueDate", value: found("202610.0B 14.08"), truth: "2026/10/08" }),
    ).toBe(false);
  });

  it("rejects a missing value", () => {
    expect(
      isCorrect({ field: "issuer", value: { status: "missing" }, truth: "東雲デザイン事務所" }),
    ).toBe(false);
  });

  it("ignores spaces in names", () => {
    expect(
      isCorrect({
        field: "issuer",
        value: found("東雲 デザイン 事務所"),
        truth: "東雲デザイン事務所",
      }),
    ).toBe(true);
  });
});
