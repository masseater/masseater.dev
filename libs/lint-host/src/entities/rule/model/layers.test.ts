import { Array as Arr, pipe } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { flattenLayers, reportedSeverity } from "./layers.ts";

interface Config {
  readonly extends?: readonly Config[];
  readonly plugins?: Readonly<Record<string, string>>;
  readonly rules?: Readonly<Record<string, "off" | "warn" | "error">>;
  readonly ignores?: readonly string[];
  readonly name: string;
}

describe("flattenLayers", () => {
  const config: Config = {
    name: "own",
    rules: { "alpha/x": "off" },
    ignores: ["own/**"],
    extends: [
      {
        name: "a",
        plugins: { alpha: "alpha" },
        rules: { "alpha/x": "error" },
        extends: [{ name: "root" }],
      },
      { name: "b", plugins: { beta: "beta" }, ignores: ["b/**"] },
    ],
  };

  test("puts every base before the config that extends it, depth first", () => {
    expect(
      pipe(
        flattenLayers<string, Config>(config).layers,
        Arr.map((layer) => layer.name),
      ),
    ).toStrictEqual(["root", "a", "b", "own"]);
  });

  test("merges plugins and rules with later layers winning and keeps every ignore", () => {
    const flat = flattenLayers<string, Config>(config);
    expect(flat.plugins).toStrictEqual({ alpha: "alpha", beta: "beta" });
    expect(flat.rules).toStrictEqual({ "alpha/x": "off" });
    expect(flat.ignores).toStrictEqual(["b/**", "own/**"]);
  });
});

describe("reportedSeverity", () => {
  test("reports warn as warn and error as error", () => {
    expect(reportedSeverity({ severity: "warn", options: {} })).toBe("warn");
    expect(reportedSeverity({ severity: "error", options: {} })).toBe("error");
  });
});
