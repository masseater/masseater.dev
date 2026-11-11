import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertFalse, assertTrue } from "@effect/vitest/utils";
import { Effect, String as Str } from "effect";

import { directoryWith, lines } from "./fixture.test.support.ts";
import { toJson } from "./json.ts";
import { lintTexts } from "./textlint.ts";

const NO_FOO_RULE = lines(
  "module.exports = (context) => ({",
  "  [context.Syntax.Str](node) {",
  '    if (context.getSource(node).includes("foo")) {',
  '      context.report(node, new context.RuleError("foo is not allowed"));',
  "    }",
  "  },",
  "});",
);

const NO_BAR_RULE = lines(
  'import type { TextlintRuleModule } from "@textlint/types";',
  "",
  "const rule: TextlintRuleModule = (context) => ({",
  "  [context.Syntax.Str](node) {",
  '    if (context.getSource(node).includes("bar")) {',
  '      context.report(node, new context.RuleError("bar is not allowed"));',
  "    }",
  "  },",
  "});",
  "",
  "export default rule;",
);

const TYPESCRIPT_FILES = {
  "node_modules/textlint-rule-no-bar/package.json": toJson({
    name: "textlint-rule-no-bar",
    type: "module",
    main: "./src/index.ts",
  }),
  "node_modules/textlint-rule-no-bar/src/index.ts": NO_BAR_RULE,
  "bar.md": "# Bar\n\nThis line says bar.\n",
};

const FILES = {
  "node_modules/textlint-rule-no-foo/package.json": toJson({
    name: "textlint-rule-no-foo",
    main: "index.js",
  }),
  "node_modules/textlint-rule-no-foo/index.js": NO_FOO_RULE,
  "clean.md": "# Clean\n\nNothing to see here.\n",
  "dirty.md": "# Dirty\n\nThis line says foo.\n",
};

const NO_FOO = { rules: { "no-foo": true } };

const reportsBrokenRules = Effect.gen(function* reportsBrokenRules() {
  const root = yield* directoryWith(FILES);
  const report = yield* lintTexts(NO_FOO, root, ["clean.md", "dirty.md"]);
  assertFalse(report.valid);
  assertTrue(Str.includes("foo is not allowed")(report.output));
  assertTrue(Str.includes("dirty.md")(report.output));
  assertFalse(Str.includes("clean.md")(report.output));
});

const passesCleanFiles = Effect.gen(function* passesCleanFiles() {
  const root = yield* directoryWith(FILES);
  assertTrue((yield* lintTexts(NO_FOO, root, ["clean.md"])).valid);
});

const loadsTypeScriptRules = Effect.gen(function* loadsTypeScriptRules() {
  const root = yield* directoryWith(TYPESCRIPT_FILES);
  const report = yield* lintTexts({ rules: { "no-bar": true } }, root, ["bar.md"]);
  assertFalse(report.valid);
  assertTrue(Str.includes("bar is not allowed")(report.output));
});

layer(fixtureLayer)("linting text", (it) => {
  it.effect("runs the rules named in the config over Markdown files", () => reportsBrokenRules);
  it.effect("passes when no file breaks a rule", () => passesCleanFiles);
  it.effect("loads rules written in TypeScript from node_modules", () => loadsTypeScriptRules);
});
