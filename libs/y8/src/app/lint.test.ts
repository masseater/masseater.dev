import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";
import type { Rule as MarkdownlintRule } from "markdownlint";
import { afterAll, expect, test } from "vite-plus/test";

import { agnix, definePlugin, defineRule, lint } from "./index.ts";
import type {
  Diagnostic,
  Y8Config,
  MarkdownNode,
  RuleContext,
  RuleEntry,
  Visitors,
  Y8Error,
} from "./index.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const DOCUMENT = "# Title\n\n## Section\n\nSome text here.   \n";
const DEFAULT_MAX = 1;
const NEXT_LINE = 1;

const lintDocument = (
  config: Y8Config,
): Effect.Effect<
  readonly Diagnostic[],
  Y8Error | PlatformError,
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

test("a file git still lists but the working tree deleted is skipped", () =>
  Effect.gen(function* deleted() {
    const fileSystem = yield* FileSystem.FileSystem;
    const root = yield* fileSystem.makeTempDirectoryScoped();
    const diagnostics = yield* lint({ root, files: ["gone.md"], config: {} });
    expect(diagnostics).toStrictEqual([]);
  }).pipe(Effect.scoped, services.runPromise));

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

const lintFiles = (
  files: Readonly<Record<string, string>>,
  config: Y8Config,
): Effect.Effect<
  readonly Diagnostic[],
  Y8Error | PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* fixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fileSystem.makeTempDirectoryScoped();
    for (const [name, text] of Rec.toEntries(files)) {
      yield* fileSystem.makeDirectory(path.dirname(path.join(root, name)), { recursive: true });
      yield* fileSystem.writeFileString(path.join(root, name), text);
    }
    return yield* lint({ root, files: Rec.keys(files), config });
  }).pipe(Effect.scoped);

const rulesOf = (diagnostics: readonly Diagnostic[]): readonly string[] =>
  pipe(
    diagnostics,
    Arr.map(({ path, rule }) => `${path} ${rule}`),
  );

test("overrides change the rules only for the files they match", () =>
  Effect.gen(function* overrides() {
    const diagnostics = yield* lintFiles(
      { "doc.md": DOCUMENT, "docs/doc.md": DOCUMENT, "docs/keep/doc.md": DOCUMENT },
      {
        rules: { "markdownlint/MD009": "off" },
        overrides: [
          { files: ["docs/**", "!docs/keep/**"], rules: { "markdownlint/MD009": "warn" } },
        ],
      },
    );
    expect(rulesOf(diagnostics)).toStrictEqual(["docs/doc.md markdownlint/MD009"]);
  }).pipe(services.runPromise));

const nameOf = (context: RuleContext): string =>
  pipe(
    Option.fromNullishOr(context.frontmatter),
    Option.flatMap(Rec.get("name")),
    Option.map(String),
    Option.getOrElse(() => "none"),
  );

const frontmatterName = defineRule({
  meta: { description: "Report the frontmatter name" },
  create: (context) => ({
    document: (): void => {
      context.report({ message: nameOf(context) });
    },
  }),
});

test("rules read the parsed YAML frontmatter", () =>
  Effect.gen(function* frontmatter() {
    const diagnostics = yield* lintFiles(
      { "doc.md": "---\nname: demo\n---\n\n# Demo\n", "plain.md": "# Plain\n" },
      { plugins: { local: definePlugin({ rules: { name: frontmatterName } }) } },
    );
    expect(
      pipe(
        diagnostics,
        Arr.map(({ path, message }) => `${path} ${message}`),
      ),
    ).toStrictEqual(["doc.md demo", "plain.md none"]);
  }).pipe(services.runPromise));

const SKILL = "---\nname: Not_A_Name\ndescription: Demo skill.\n---\n\n# Demo\n";

test("agnix checks agent files and its rules can be turned off by id", () =>
  Effect.gen(function* agent() {
    const files = { "skills/demo/SKILL.md": SKILL };
    const found = yield* lintFiles(files, { plugins: { agnix } });
    const ids = pipe(
      found,
      Arr.map(({ rule }) => rule),
      Arr.filter(Str.startsWith("agnix/")),
    );
    expect(ids).not.toStrictEqual([]);
    const disabled = yield* lintFiles(files, {
      plugins: { agnix },
      rules: pipe(
        ids,
        Arr.map((id): readonly [string, RuleEntry] => [id, "off"]),
        Rec.fromEntries,
      ),
    });
    expect(
      pipe(
        disabled,
        Arr.filter(({ rule }) => Str.startsWith("agnix/")(rule)),
      ),
    ).toStrictEqual([]);
  }).pipe(services.runPromise));

test("a built-in plugin reports under the name it is registered with, at the configured severity", () =>
  Effect.gen(function* registered() {
    const files = { "skills/demo/SKILL.md": SKILL };
    const found = yield* lintFiles(files, { plugins: { agents: agnix } });
    const ids = pipe(
      found,
      Arr.map(({ rule }) => rule),
      Arr.filter(Str.startsWith("agents/")),
      Arr.dedupe,
    );
    expect(ids).not.toStrictEqual([]);
    const warned = yield* lintFiles(files, {
      plugins: { agents: agnix },
      rules: pipe(
        ids,
        Arr.map((id): readonly [string, RuleEntry] => [id, "warn"]),
        Rec.fromEntries,
      ),
    });
    expect(
      pipe(
        warned,
        Arr.filter(({ rule }) => Str.startsWith("agents/")(rule)),
        Arr.map(({ severity }) => severity),
        Arr.dedupe,
      ),
    ).toStrictEqual(["warn"]);
  }).pipe(services.runPromise));

test("a config takes the rules and overrides of the configs it extends, its own rules winning", () =>
  Effect.gen(function* extended() {
    const loud: Y8Config = { rules: { "markdownlint/MD009": "error" } };
    const docs: Y8Config = {
      overrides: [{ files: ["docs/**"], rules: { "markdownlint/MD009": "warn" } }],
    };
    const diagnostics = yield* lintFiles(
      { "doc.md": DOCUMENT, "docs/doc.md": DOCUMENT },
      { extends: [loud, docs], rules: { "markdownlint/MD009": "off" } },
    );
    expect(rulesOf(diagnostics)).toStrictEqual(["docs/doc.md markdownlint/MD009"]);
  }).pipe(services.runPromise));
