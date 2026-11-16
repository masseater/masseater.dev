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

const importedModules = (statements: readonly ESTree.Statement[]): readonly string[] =>
  pipe(
    statements,
    Arr.filter((statement) => statement.type === "ImportDeclaration"),
    Arr.map((declaration) => declaration.source.value),
  );

const parserIn =
  (context: Context) =>
  (format: Format): Option.Option<string> => {
    const imported = importedModules(context.sourceCode.ast.body);
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

const messageFor =
  (context: Context) =>
  (text: string): Option.Option<string> => {
    const name = baseNameOf(text);
    return pipe(
      ECOSYSTEM_FILES,
      Arr.findFirst((entry) => entry.name.test(name)),
      Option.flatMap(({ format, reader }) =>
        pipe(
          parserIn(context)(format),
          Option.map(
            (parser) =>
              `${name} has an official reader: ${reader}. Read it with that instead of parsing it with ${parser}, so that the file means what its own tool says it means.`,
          ),
        ),
      ),
    );
  };

export const ecosystemReaders: Rule = {
  meta: { type: "problem" },
  create: (context) => ({
    Literal: (node): void => {
      const message = pipe(
        Option.liftPredicate(node.value, (value) => typeof value === "string"),
        Option.flatMap(messageFor(context)),
      );
      if (Option.isSome(message)) {
        context.report({ node, message: message.value });
      }
    },
    TemplateElement: (node): void => {
      const message = messageFor(context)(node.value.raw);
      if (Option.isSome(message)) {
        context.report({ node, message: message.value });
      }
    },
  }),
};
