import {
  Array as Arr,
  Effect,
  HashSet,
  Option,
  Record as Rec,
  Result,
  Schema,
  String as Str,
  pipe,
} from "effect";

import {
  SyntaxKind,
  isExportDeclaration,
  isImportDeclaration,
  isStringLiteral,
} from "./compiler.ts";
import type { API, Node } from "./compiler.ts";
import { MANIFEST_FILE } from "./dependencies.ts";
import { RepositoryFiles } from "./repository-files.ts";

const RELATIVE = /^\.\.?(?:\/|$)/u;
const SUBPATH_IMPORT = "#";
const WILDCARD = "*";
const SCOPE = "@";
const SEPARATOR = "/";
const SOURCE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts"] as const;
const SCOPED_SEGMENTS = 2;
const PLAIN_SEGMENTS = 1;

const ImportsField = Schema.Struct({
  imports: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

const decodeImports = Schema.decodeOption(Schema.fromJsonString(ImportsField));

interface Graph {
  readonly api: API;
  readonly directory: string;
  readonly imports: Readonly<Record<string, string>>;
}

interface Walk {
  readonly pending: readonly string[];
  readonly visited: HashSet.HashSet<string>;
  readonly packages: HashSet.HashSet<string>;
}

type Reference = Result.Result<string, string>;

const packageNameOf = (specifier: string): string => {
  const segments = Str.split(specifier, SEPARATOR);
  if (Str.startsWith(SCOPE)(specifier)) {
    return pipe(segments, Arr.take(SCOPED_SEGMENTS), Arr.join(SEPARATOR));
  }
  return pipe(segments, Arr.take(PLAIN_SEGMENTS), Arr.join(SEPARATOR));
};

const literalText = (specifier: Node): Option.Option<string> =>
  pipe(
    Option.liftPredicate(specifier, isStringLiteral),
    Option.map((literal) => literal.text),
  );

const runtimeSpecifierOf = (statement: Node): Option.Option<string> => {
  if (isImportDeclaration(statement)) {
    const typeOnly = pipe(
      Option.fromUndefinedOr(statement.importClause),
      Option.exists((clause) => clause.phaseModifier === SyntaxKind.TypeKeyword),
    );
    return Option.filter(literalText(statement.moduleSpecifier), () => !typeOnly);
  }
  if (isExportDeclaration(statement) && !statement.isTypeOnly) {
    return Option.flatMap(Option.fromUndefinedOr(statement.moduleSpecifier), literalText);
  }
  return Option.none();
};

const specifiersIn = (api: API, file: string, text: string): readonly string[] => {
  const retained = api.createSourceFile(file, text);
  const found = pipe(retained.sourceFile.statements, Arr.fromIterable, Arr.map(runtimeSpecifierOf));
  retained.dispose();
  return Arr.getSomes(found);
};

const subpathTarget = (
  imports: Readonly<Record<string, string>>,
  specifier: string,
): Option.Option<string> =>
  pipe(
    Rec.toEntries(imports),
    Arr.findFirst(([pattern, target]) => {
      if (!Str.endsWith(WILDCARD)(pattern)) {
        return Option.liftPredicate(target, () => pattern === specifier);
      }
      const prefix = Str.replace(WILDCARD, "")(pattern);
      return Option.liftPredicate(
        Str.replace(WILDCARD, Str.replace(prefix, "")(specifier))(target),
        () => Str.startsWith(prefix)(specifier),
      );
    }),
  );

const existingSource = Effect.fn("existingSource")(function* existingSource(base: string) {
  const files = yield* RepositoryFiles;
  const found = yield* pipe(
    SOURCE_SUFFIXES,
    Effect.forEach((suffix) => {
      const candidate = `${base}${suffix}`;
      return files
        .isDirectory(candidate)
        .pipe(
          Effect.map((directory) =>
            Option.liftPredicate(candidate, () =>
              Option.exists(directory, (isDirectory) => !isDirectory),
            ),
          ),
        );
    }),
  );
  return Arr.head(Arr.getSomes(found));
});

const localFile = Effect.fn("localFile")(function* localFile(
  { directory, imports }: Graph,
  from: string,
  specifier: string,
) {
  const files = yield* RepositoryFiles;
  if (RELATIVE.test(specifier)) {
    return yield* existingSource(files.resolve(files.dirname(from), specifier));
  }
  const target = subpathTarget(imports, specifier);
  if (Option.isNone(target)) {
    return Option.none<string>();
  }
  return yield* existingSource(files.resolve(directory, target.value));
});

const referenceOf = (
  graph: Graph,
  from: string,
  specifier: string,
): Effect.Effect<Option.Option<Reference>, never, RepositoryFiles> => {
  if (RELATIVE.test(specifier) || Str.startsWith(SUBPATH_IMPORT)(specifier)) {
    return localFile(graph, from, specifier).pipe(Effect.map(Option.map(Result.succeed)));
  }
  const name = packageNameOf(specifier);
  return Effect.succeedSome(Result.fail(name));
};

const referencesIn = Effect.fn("referencesIn")(function* referencesIn(graph: Graph, file: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(file);
  const specifiers = Option.match(text, {
    onNone: (): readonly string[] => [],
    onSome: (source) => specifiersIn(graph.api, file, source),
  });
  const references = yield* pipe(
    specifiers,
    Effect.forEach((specifier) => referenceOf(graph, file, specifier)),
  );
  const found = Arr.getSomes(references);
  return { packages: Arr.getFailures(found), sources: Arr.getSuccesses(found) };
});

const packagesFrom = (
  graph: Graph,
  walk: Walk,
): Effect.Effect<HashSet.HashSet<string>, never, RepositoryFiles> =>
  Arr.match(walk.pending, {
    onEmpty: () => Effect.succeed(walk.packages),
    onNonEmpty: ([next, ...rest]) => {
      if (HashSet.has(walk.visited, next)) {
        return packagesFrom(graph, { ...walk, pending: rest });
      }
      return referencesIn(graph, next).pipe(
        Effect.flatMap(({ packages, sources }) =>
          packagesFrom(graph, {
            pending: [...rest, ...sources],
            visited: HashSet.add(walk.visited, next),
            packages: HashSet.union(walk.packages, HashSet.fromIterable(packages)),
          }),
        ),
      );
    },
  });

/** @internal */
const packagesByEntry = Effect.fn("packagesByEntry")(function* packagesByEntry(
  api: API,
  directory: string,
  entries: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const manifest = yield* files.readFile(files.join(directory, MANIFEST_FILE));
  const imports = pipe(
    manifest,
    Option.flatMap(decodeImports),
    Option.flatMap((field) => Option.fromUndefinedOr(field.imports)),
    Option.getOrElse((): Readonly<Record<string, string>> => ({})),
  );
  const graph: Graph = { api, directory, imports };
  return yield* pipe(
    entries,
    Effect.forEach((entry) =>
      packagesFrom(graph, {
        pending: [entry],
        visited: HashSet.empty(),
        packages: HashSet.empty(),
      }).pipe(Effect.map((packages) => [entry, packages] as const)),
    ),
  );
});

export { packagesByEntry };
