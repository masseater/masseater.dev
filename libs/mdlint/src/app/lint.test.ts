import { NodeServices } from "@effect/platform-node";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";
import type { Rule as MarkdownlintRule } from "markdownlint";
import { afterAll, expect, test } from "vite-plus/test";

import { definePlugin, defineRule, lint } from "./index.ts";
import type {
  Diagnostic,
  MdlintConfig,
  MarkdownNode,
  RuleContext,
  Visitors,
  MdlintError,
} from "./index.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const DOCUMENT = "# Title\n\n## Section\n\nSome text here.   \n";
const DEFAULT_MAX = 1;
const NEXT_LINE = 1;

const lintDocument = (
  config: MdlintConfig,
): Effect.Effect<
  readonly Diagnostic[],
  MdlintError | PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* fixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fileSystem.makeTempDirectoryScoped();
    yield* fileSystem.writeFileString(path.join(root, "doc.md"), DOCUMENT);
    return yield* lint({ root, files: ["doc.md"], config });
  }).pipe(Effect.scoped);

test("built-in rules report like markdownlint and follow the configured severity", () =>
  Effect.gen(function* builtin() {
    const diagnostics = yield* lintDocument({ rules: { "markdownlint/MD009": "warn" } });
    expect(diagnostics).toMatchObject([
      {
        path: "doc.md",
        line: 5,
        rule: "markdownlint/MD009",
        severity: "warn",
        column: 16,
        length: 3,
      },
    ]);
  }).pipe(services.runPromise));

test("a rule can be turned off by any of its names", () =>
  Effect.gen(function* off() {
    const diagnostics = yield* lintDocument({
      rules: { "markdownlint/no-trailing-spaces": "off" },
    });
    expect(diagnostics).toStrictEqual([]);
  }).pipe(services.runPromise));

const countHeadings = (context: RuleContext): Visitors => {
  const found: string[] = [];
  const max = Number(context.options["max"] ?? DEFAULT_MAX);
  return {
    heading: (node: MarkdownNode) => {
      const text = Str.trim(context.textOf(node));
      found.push(text);
      if (found.length > max) {
        context.report({ node, message: `Too many headings: ${text}` });
      }
    },
  };
};

const headingCount = defineRule({
  meta: { description: "Limit the number of headings" },
  create: countHeadings,
});

test("TypeScript rules visit the tree and report positions in UTF-16 columns", () =>
  Effect.gen(function* script() {
    const diagnostics = yield* lintDocument({
      plugins: { local: definePlugin({ rules: { "heading-count": headingCount } }) },
      rules: { "markdownlint/MD009": "off", "local/heading-count": ["error", { max: 1 }] },
    });
    expect(diagnostics).toMatchObject([
      { line: 3, column: 1, rule: "local/heading-count", message: "Too many headings: ## Section" },
    ]);
  }).pipe(services.runPromise));

const noHere: MarkdownlintRule = {
  names: ["no-here"],
  description: "Do not write here",
  tags: ["text"],
  parser: "none",
  function: (params, onError) => {
    for (const [index, line] of params.lines.entries()) {
      if (Str.includes("here")(line)) {
        onError({ lineNumber: index + NEXT_LINE, detail: "here" });
      }
    }
  },
};

test("markdownlint custom rules run through markdownlint itself", () =>
  Effect.gen(function* compat() {
    const diagnostics = yield* lintDocument({
      plugins: { legacy: definePlugin({ markdownlintRules: [noHere] }) },
      rules: { "markdownlint/MD009": "off" },
    });
    expect(
      pipe(
        diagnostics,
        Arr.map(({ rule }) => rule),
      ),
    ).toStrictEqual(["legacy/no-here"]);
    expect(diagnostics).toMatchObject([{ line: 5, detail: "here" }]);
  }).pipe(services.runPromise));

test("rules for a plugin that is not configured fail loudly", () =>
  Effect.gen(function* unknown() {
    const failure = yield* lintDocument({ rules: { "missing/rule": "error" } }).pipe(Effect.flip);
    expect(failure.message).toContain("missing");
  }).pipe(services.runPromise));
