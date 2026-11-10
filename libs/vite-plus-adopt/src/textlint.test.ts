import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertFalse, assertTrue } from "@effect/vitest/utils";
import { Effect, String as Str } from "effect";

import { directoryWith, lines } from "./fixture.test.support.ts";
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

const FILES = {
  "node_modules/textlint-rule-no-foo/package.json": JSON.stringify({
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

layer(fixtureLayer)("linting text", (it) => {
  it.effect("runs the rules named in the config over Markdown files", () => reportsBrokenRules);
  it.effect("passes when no file breaks a rule", () => passesCleanFiles);
});
