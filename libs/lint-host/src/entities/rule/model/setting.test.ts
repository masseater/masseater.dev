import { describe, expect, test } from "vite-plus/test";

import { mergedRules, settingOf } from "./setting.ts";

describe("settingOf", () => {
  test("reads a bare severity without options", () => {
    expect(settingOf("warn")).toStrictEqual({ severity: "warn", options: {} });
  });

  test("reads a severity in a tuple without options", () => {
    expect(settingOf(["error"])).toStrictEqual({ severity: "error", options: {} });
  });

  test("keeps the options given with the severity", () => {
    const options = { max: 3 };
    expect(settingOf(["off", options])).toStrictEqual({ severity: "off", options });
  });
});

describe("mergedRules", () => {
  const options = { max: 3 };

  test("keeps the earlier options when a later layer sets only the severity", () => {
    expect(mergedRules([{ size: ["warn", options] }, { size: "error" }])).toStrictEqual({
      size: ["error", options],
    });
  });

  test("keeps the earlier options when a later layer sets the severity in a tuple", () => {
    expect(mergedRules([{ size: ["warn", options] }, { size: ["off"] }])).toStrictEqual({
      size: ["off", options],
    });
  });

  test("replaces the earlier options with the later ones without merging them", () => {
    expect(
      mergedRules([{ size: ["warn", { max: 3, min: 1 }] }, { size: ["error", { max: 5 }] }]),
    ).toStrictEqual({ size: ["error", { max: 5 }] });
  });

  test("keeps rules each layer names alone", () => {
    expect(mergedRules([{ size: "warn" }, {}, { width: "off" }])).toStrictEqual({
      size: "warn",
      width: "off",
    });
  });
});
