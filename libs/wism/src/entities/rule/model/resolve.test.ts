import { constVoid } from "effect/Function";
import { expect, test } from "vite-plus/test";

import type { Plugin, Rule } from "#/shared/config/index.ts";

import { definePlugin, defineRule } from "./define.ts";
import { resolve, unknownPlugins } from "./resolve.ts";

const rule: Rule = defineRule({ meta: { description: "does nothing" }, check: constVoid });
const plugin: Plugin = definePlugin({ rules: { quiet: rule, "nested/name": rule } });

test("maps built-in rules to their severities", () => {
  const resolved = resolve({
    rules: { placement: "off", "public-api": "warn", "cross-slice": ["error"] },
  });
  expect(resolved.builtin).toStrictEqual({
    placement: "off",
    "public-api": "warn",
    "cross-slice": "error",
  });
  expect(resolved.scripts).toStrictEqual([]);
});

test("finds plugin rules with their settings and drops the ones turned off", () => {
  const resolved = resolve({
    plugins: { local: plugin },
    rules: {
      "local/quiet": ["warn", { depth: 2 }],
      "local/nested/name": "error",
      "local/missing": "error",
      "other/quiet": "error",
      placement: "warn",
    },
  });
  expect(resolved.builtin).toStrictEqual({ placement: "warn" });
  expect(resolved.scripts).toStrictEqual([
    { id: "local/quiet", rule, setting: { severity: "warn", options: { depth: 2 } } },
    { id: "local/nested/name", rule, setting: { severity: "error", options: {} } },
  ]);
  expect(
    resolve({ plugins: { local: plugin }, rules: { "local/quiet": "off" } }).scripts,
  ).toStrictEqual([]);
});

test("names each plugin that rules use but the config does not define", () => {
  expect(
    unknownPlugins({
      plugins: { local: plugin },
      rules: { "local/quiet": "error", "a/one": "error", "a/two": "warn", "b/x": "off" },
    }),
  ).toStrictEqual(["a", "b"]);
  expect(unknownPlugins({})).toStrictEqual([]);
});
