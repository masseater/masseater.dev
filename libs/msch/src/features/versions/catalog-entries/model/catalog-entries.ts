import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { isMap, isScalar, isSeq, parseDocument } from "yaml";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const LOCK_FILE = "pnpm-lock.yaml";
const MANIFEST = /(?:^|\/)package\.json$/u;
const CATALOG_PROTOCOL = "catalog:";
const DEFAULT_CATALOG = "default";
const VERSION_SEPARATOR = "||";
const WILDCARD = "*";
const START = 0;
const SCOPED_NAME = /^(?<name>@?[^@]+)(?:@(?<versions>.+))?$/u;
const KEY_BEFORE = [" ", "'", '"', "/"];
const KEY_AFTER = [":", "'", '"', "("];
const READ_CONCURRENCY = 16;
const STALE_RULE: RuleName = "stale-release-age-exclude";
const UNUSED_RULE: RuleName = "unused-catalog-entry";
const STALE_MESSAGE =
  "excludes a version from `minimumReleaseAge` that the lockfile no longer resolves. Remove the entry: it only exempted that one version while it was new.";
const UNUSED_MESSAGE =
  "is a catalog entry no package refers to. Remove it, so the catalog holds only versions in use.";

interface KeyedEntry {
  readonly name: string;
  readonly value: string;
  readonly offset: number;
}

interface CatalogEntry extends KeyedEntry {
  readonly catalog: string;
}

const Fields = Schema.Record(Schema.String, Schema.Unknown);
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Fields));
const decodeFields = Schema.decodeUnknownOption(Fields);
const decodeString = Schema.decodeUnknownOption(Schema.String);

const offsetOf = (range: readonly number[] | null | undefined): number =>
  pipe(
    Option.fromNullishOr(range),
    Option.flatMap(Arr.head),
    Option.getOrElse(() => START),
  );

const scalarText = (node: unknown): string =>
  pipe(
    Option.liftPredicate(node, isScalar),
    Option.map(({ value }) => String(value)),
    Option.getOrElse(() => ""),
  );

const mapEntries = (node: unknown): readonly KeyedEntry[] =>
  pipe(
    Option.liftPredicate(node, isMap),
    Option.map(({ items }) => items),
    Option.getOrElse((): readonly { key: unknown; value: unknown }[] => []),
    Arr.flatMap(({ key, value }) =>
      pipe(
        Option.liftPredicate(key, isScalar),
        Option.map((scalar) => ({
          name: String(scalar.value),
          value: scalarText(value),
          offset: offsetOf(scalar.range),
        })),
        Option.toArray,
      ),
    ),
  );

const inCatalog =
  (catalog: string) =>
  (entry: KeyedEntry): CatalogEntry => ({
    name: entry.name,
    value: entry.value,
    offset: entry.offset,
    catalog,
  });

const entriesOf = (catalog: string, node: unknown): readonly CatalogEntry[] =>
  pipe(mapEntries(node), Arr.map(inCatalog(catalog)));

const catalogEntries = (catalog: unknown, catalogs: unknown): readonly CatalogEntry[] => [
  ...pipe(mapEntries(catalog), Arr.map(inCatalog(DEFAULT_CATALOG))),
  ...pipe(
    Option.liftPredicate(catalogs, isMap),
    Option.map(({ items }) => items),
    Option.getOrElse((): readonly { key: unknown; value: unknown }[] => []),
    Arr.flatMap(({ key, value }) => entriesOf(scalarText(key), value)),
  ),
];

const excludeEntries = (node: unknown): readonly KeyedEntry[] =>
  pipe(
    Option.liftPredicate(node, isSeq),
    Option.map(({ items }) => items),
    Option.getOrElse((): readonly unknown[] => []),
    Arr.flatMap((item) =>
      pipe(
        Option.liftPredicate(item, isScalar),
        Option.map((scalar) => ({
          name: String(scalar.value),
          value: "",
          offset: offsetOf(scalar.range),
        })),
        Option.toArray,
      ),
    ),
  );

const catalogOf = (specifier: string): Option.Option<string> =>
  pipe(
    Option.liftPredicate(specifier, Str.startsWith(CATALOG_PROTOCOL)),
    Option.map(Str.slice(CATALOG_PROTOCOL.length)),
    Option.map((name) =>
      Option.getOrElse(Option.liftPredicate(name, Str.isNonEmpty), () => DEFAULT_CATALOG),
    ),
  );

const referenceOf = ([name, specifier]: readonly [string, unknown]): readonly string[] =>
  pipe(
    decodeString(specifier),
    Option.flatMap(catalogOf),
    Option.map((catalog) => `${catalog}:${name}`),
    Option.toArray,
  );

const referencesIn = (manifest: Readonly<Record<string, unknown>>): readonly string[] =>
  pipe(
    Rec.values(manifest),
    Arr.flatMap((section) =>
      pipe(
        Option.getOrElse(decodeFields(section), () => ({})),
        Rec.toEntries,
        Arr.flatMap(referenceOf),
      ),
    ),
  );

const isKeyIn =
  (lock: string) =>
  (key: string): boolean =>
    pipe(
      KEY_BEFORE,
      Arr.some((before) =>
        pipe(
          KEY_AFTER,
          Arr.some((after) => Str.includes(`${before}${key}${after}`)(lock)),
        ),
      ),
    );

const versionsOf = (raw: string | undefined): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(raw),
    Option.map((listed) => pipe(Str.split(listed, VERSION_SEPARATOR), Arr.map(Str.trim))),
    Option.getOrElse((): readonly string[] => []),
  );

const resolvedIn =
  (lock: string) =>
  (entry: string): boolean =>
    Str.includes(WILDCARD)(entry) ||
    pipe(
      Option.fromNullishOr(SCOPED_NAME.exec(entry)),
      Option.flatMap(({ groups }) => Option.fromUndefinedOr(groups)),
      Option.match({
        onNone: () => true,
        onSome: ({ name = "", versions }) =>
          Arr.match(versionsOf(versions), {
            onEmpty: () => Str.includes(`${name}@`)(lock),
            onNonEmpty: Arr.some((version) => isKeyIn(lock)(`${name}@${version}`)),
          }),
      }),
    );

const usedCatalogEntries = Effect.fn("usedCatalogEntries")(function* usedCatalogEntries(
  root: string,
  overrides: unknown,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const manifests = yield* Effect.forEach(
    pipe(
      listed,
      Arr.filter((name) => MANIFEST.test(name)),
    ),
    (name) => files.readFile(files.join(root, name)),
    { concurrency: READ_CONCURRENCY },
  );
  return new Set([
    ...pipe(
      Arr.getSomes(manifests),
      Arr.flatMap((text) => Option.toArray(decodeManifest(text))),
      Arr.flatMap(referencesIn),
    ),
    ...pipe(
      mapEntries(overrides),
      Arr.flatMap(({ name, value }) => referenceOf([name, value])),
    ),
  ]);
});

const findingsIn = Effect.fn("findingsIn")(function* findingsIn(
  root: string,
  file: string,
  source: string,
) {
  const files = yield* RepositoryFiles;
  const document = parseDocument(source);
  const at = positionOf(source);
  const problemAt =
    (rule: RuleName, message: string) =>
    ({ name, offset }: KeyedEntry): Problem => {
      const { line, column } = at(offset);
      return { file, line, column, rule, message: `\`${name}\` ${message}` };
    };
  const used = yield* usedCatalogEntries(root, document.get("overrides", true));
  const lock = yield* files.readFile(files.join(root, LOCK_FILE));
  const unused = pipe(
    catalogEntries(document.get("catalog", true), document.get("catalogs", true)),
    Arr.filter(({ catalog, name }) => !used.has(`${catalog}:${name}`)),
    Arr.map(problemAt(UNUSED_RULE, UNUSED_MESSAGE)),
  );
  const stale = pipe(
    Option.toArray(lock),
    Arr.flatMap((text) =>
      pipe(
        excludeEntries(document.get("minimumReleaseAgeExclude", true)),
        Arr.filter(({ name }) => !resolvedIn(text)(name)),
      ),
    ),
    Arr.map(problemAt(STALE_RULE, STALE_MESSAGE)),
  );
  return [...unused, ...stale];
});

/** @internal */
export const checkCatalogEntries = Effect.fn("checkCatalogEntries")(function* checkCatalogEntries(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, WORKSPACE_FILE);
  const source = yield* files.readFile(file);
  return yield* Option.match(source, {
    onNone: () => Effect.succeed<readonly Problem[]>([]),
    onSome: (text) => findingsIn(root, file, text),
  });
});
