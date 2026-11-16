import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";
import type { Context, ESTree, Rule } from "vite-plus/lint/plugins";

type Format = "json" | "toml" | "typescript" | "yaml";

interface EcosystemFile {
  readonly name: RegExp;
  readonly format: Format;
  readonly reader: string;
}

const ECOSYSTEM_FILES: readonly EcosystemFile[] = [
  {
    name: /^pnpm-workspace\.yaml$/u,
    format: "yaml",
    reader:
      "readWorkspaceManifest from @pnpm/workspace.workspace-manifest-reader, findWorkspaceProjects from @pnpm/workspace.projects-reader or updateWorkspaceManifest from @pnpm/workspace.workspace-manifest-writer",
  },
  {
    name: /^pnpm-lock\.yaml$/u,
    format: "yaml",
    reader: "readWantedLockfile from @pnpm/lockfile.fs",
  },
  { name: /^Cargo\.(?:toml|lock)$/u, format: "toml", reader: "cargo metadata" },
  {
    name: /^tsconfig(?:\.[\w-]+)?\.json$/u,
    format: "json",
    reader: "parse from tsconfck or the TypeScript compiler API",
  },
  {
    name: /^vite\.config\.[cm]?[jt]s$/u,
    format: "typescript",
    reader:
      "resolveConfigFromFile from vite-plus, or parse from vite-plus for a read that must not run the file",
  },
];

const PARSER_MODULES: Readonly<Record<Format, readonly string[]>> = {
  json: ["jsonc-parser", "json5", "strip-json-comments"],
  toml: ["smol-toml", "@iarna/toml", "toml", "toml-eslint-parser"],
  typescript: ["typescript", "oxc-parser", "@babel/parser", "@typescript-eslint/parser", "acorn"],
  yaml: ["yaml", "js-yaml"],
};

const PARSER_CALLS: Readonly<Record<Format, Option.Option<RegExp>>> = {
  json: Option.some(/\b(?:JSON\.parse|parseJson)\b/u),
  toml: Option.none(),
  typescript: Option.none(),
  yaml: Option.none(),
};

const SEPARATOR = "/";

const baseNameOf = (text: string): string =>
  pipe(
    Str.split(text, SEPARATOR),
    Arr.last,
    Option.getOrElse(() => text),
  );

const importedModules = (program: ESTree.Program): readonly string[] =>
  pipe(
    program.body,
    Arr.flatMap((statement) =>
      statement.type === "ImportDeclaration" ? [statement.source.value] : [],
    ),
  );

const parserIn =
  (context: Context) =>
  (format: Format): Option.Option<string> => {
    const imported = importedModules(context.sourceCode.ast);
    const fromModule = pipe(
      Rec.get(PARSER_MODULES, format),
      Option.getOrElse((): readonly string[] => []),
      Arr.findFirst((module) => Arr.contains(imported, module)),
    );
    if (Option.isSome(fromModule)) {
      return fromModule;
    }
    return pipe(
      Rec.get(PARSER_CALLS, format),
      Option.flatten,
      Option.flatMap((pattern) => Option.fromNullishOr(pattern.exec(context.sourceCode.text))),
      Option.map(([call]) => call),
    );
  };

const reportNamed = (context: Context, node: ESTree.Node, text: string): void => {
  const name = baseNameOf(text);
  const file = Arr.findFirst(ECOSYSTEM_FILES, (entry) => entry.name.test(name));
  if (Option.isNone(file)) {
    return;
  }
  const parser = parserIn(context)(file.value.format);
  if (Option.isNone(parser)) {
    return;
  }
  context.report({
    node,
    message: `${name} has an official reader: ${file.value.reader}. Read it with that instead of parsing it with ${parser.value}, so that the file means what its own tool says it means.`,
  });
};

export const ecosystemReaders: Rule = {
  meta: { type: "problem" },
  create: (context) => ({
    Literal: (node): void => {
      if (typeof node.value === "string") {
        reportNamed(context, node, node.value);
      }
    },
    TemplateElement: (node): void => {
      reportNamed(context, node, node.value.raw);
    },
  }),
};
