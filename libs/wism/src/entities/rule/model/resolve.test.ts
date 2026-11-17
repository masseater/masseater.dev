import { constVoid } from "effect/Function";
import { expect, test } from "vite-plus/test";

import type { Plugin, Rule } from "#/shared/config/index.ts";

import { definePlugin, defineRule } from "./define.ts";
import { resolve, unknownRules } from "./resolve.ts";

const rule: Rule = defineRule({ meta: { description: "does nothing" }, check: constVoid });
const plugin: Plugin = definePlugin({ rules: { quiet: rule, "nested/name": rule } });

test("finds plugin rules with their settings and drops the ones turned off", () => {
  expect(
    resolve({
      plugins: { local: plugin },
      rules: {
        "local/quiet": ["warn", { depth: 2 }],
        "local/nested/name": "error",
        "local/missing": "error",
        "other/quiet": "error",
        placement: "warn",
      },
    }),
  ).toStrictEqual([
    { id: "local/quiet", rule, setting: { severity: "warn", options: { depth: 2 } } },
    { id: "local/nested/name", rule, setting: { severity: "error", options: {} } },
  ]);
  expect(resolve({ plugins: { local: plugin }, rules: { "local/quiet": "off" } })).toStrictEqual(
    [],
  );
  expect(resolve({})).toStrictEqual([]);
});

test("names each rule that no configured plugin defines, bare names included", () => {
  expect(
    unknownRules({
      plugins: { local: plugin },
      rules: {
        "local/quiet": "error",
        "local/missing": "warn",
        "a/one": "error",
        placement: "off",
      },
    }),
  ).toStrictEqual(["local/missing", "a/one", "placement"]);
  expect(unknownRules({})).toStrictEqual([]);
});
