import { Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import type { ScriptRule } from "#/entities/rule/index.ts";
import type { RuleContext } from "#/shared/config/index.ts";

import { runScriptRules } from "./run.ts";

const graph = {
  files: ["a.ts", "b.ts"],
  nodes: [],
  edges: [],
};

const ruleOf = (
  id: string,
  severity: ScriptRule["setting"]["severity"],
  check: (context: RuleContext) => void,
): ScriptRule => ({
  id,
  rule: { meta: { description: id }, check },
  setting: { severity, options: { limit: 1 } },
});

test("turns each report into a diagnostic of the rule", () => {
  const seen: RuleContext[] = [];
  const diagnostics = runScriptRules([
    ruleOf("local/every-file", "warn", (context) => {
      seen.push(context);
      for (const file of context.files) {
        context.report({ path: file, message: `saw ${file}` });
      }
    }),
    ruleOf("local/placed", "error", ({ report }) => {
      report({ path: "b.ts", line: 3, column: 7, message: "placed" });
    }),
  ])(graph);
  expect(diagnostics).toStrictEqual([
    {
      path: "a.ts",
      line: 1,
      column: 1,
      rule: "local/every-file",
      message: "saw a.ts",
      severity: "warn",
    },
    {
      path: "b.ts",
      line: 1,
      column: 1,
      rule: "local/every-file",
      message: "saw b.ts",
      severity: "warn",
    },
    {
      path: "b.ts",
      line: 3,
      column: 7,
      rule: "local/placed",
      message: "placed",
      severity: "error",
    },
  ]);
  expect(
    pipe(
      seen,
      Arr.map(({ files, options }) => ({ files, options })),
    ),
  ).toStrictEqual([{ files: ["a.ts", "b.ts"], options: { limit: 1 } }]);
});

test("returns nothing without rules", () => {
  expect(runScriptRules([])(graph)).toStrictEqual([]);
});
