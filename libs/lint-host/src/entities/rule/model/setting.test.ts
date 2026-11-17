import { describe, expect, test } from "vite-plus/test";

import { settingOf } from "./setting.ts";

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
