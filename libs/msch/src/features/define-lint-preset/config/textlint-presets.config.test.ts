import { Array as Arr, Predicate, Record as Rec, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { textlintPresets } from "./textlint-presets.config.ts";

const contextOf = (source: string): never =>
  ({
    getSource: () => source,
    Syntax: {},
    RuleError: class {},
    report: () => undefined,
    getFilePath: () => "README.md",
    getConfigBaseDir: () => undefined,
    fixer: {},
    locator: {},
    shouldIgnore: () => undefined,
  }) as never;

const handlersFor = (source: string): readonly number[] =>
  pipe(
    Rec.values(textlintPresets),
    Arr.flatMap((preset) => Rec.values(preset.rules)),
    Arr.map((rule) => (Predicate.isFunction(rule) ? rule : rule.linter)),
    Arr.map((reporter) => Rec.size(reporter(contextOf(source), {}))),
  );

describe("textlintPresets", () => {
  it("does not lint documents without Japanese", () => {
    expect(
      Arr.every(handlersFor("# kit\n\nRun the checks, then fix them.\n"), (size) => size === 0),
    ).toBe(true);
  });
  it("lints documents with Japanese", () => {
    expect(Arr.some(handlersFor("# kit\n\n検査を実行する。\n"), (size) => size > 0)).toBe(true);
  });
});
