import { readWantedLockfile } from "@pnpm/lockfile.fs";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import { workspaceManifest } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { LockfileUnreadable } from "./lockfile-unreadable.ts";

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const MANIFEST = /(?:^|\/)package\.json$/u;
const CATALOG_PROTOCOL = "catalog:";
const DEFAULT_CATALOG = "default";
const VERSION_SEPARATOR = "||";
const WILDCARD = "*";
const FIRST_LINE = 1;
const FIRST_COLUMN = 1;
const SCOPED_NAME = /^(?<name>@?[^@]+)(?:@(?<versions>.+))?$/u;
const READ_CONCURRENCY = 16;
const STALE_RULE: RuleName = "stale-release-age-exclude";
const UNUSED_RULE: RuleName = "unused-catalog-entry";
const STALE_MESSAGE =
  "excludes a version from `minimumReleaseAge` that the lockfile no longer resolves. Remove the entry: it only exempted that one version while it was new.";
const UNUSED_MESSAGE =
  "is a catalog entry no package refers to. Remove it, so the catalog holds only versions in use.";

interface CatalogEntry {
  readonly catalog: string;
  readonly name: string;
}

type Fields = Readonly<Record<string, unknown>>;

const FieldsSchema = Schema.Record(Schema.String, Schema.Unknown);
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(FieldsSchema));
const decodeFields = Schema.decodeUnknownOption(FieldsSchema);
const decodeString = Schema.decodeUnknownOption(Schema.String);
const decodeStrings = Schema.decodeUnknownOption(Schema.Array(Schema.String));

const fieldsOf = (value: unknown): Fields => Option.getOrElse(decodeFields(value), () => ({}));

const entriesOf =
  (catalog: string) =>
  (held: unknown): readonly CatalogEntry[] =>
    pipe(
      Rec.keys(fieldsOf(held)),
      Arr.map((name) => ({ catalog, name })),
    );

const catalogEntries = (settings: Fields): readonly CatalogEntry[] => [
  ...entriesOf(DEFAULT_CATALOG)(settings["catalog"]),
  ...pipe(
    Rec.toEntries(fieldsOf(settings["catalogs"])),
    Arr.flatMap(([catalog, held]) => entriesOf(catalog)(held)),
  ),
];

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

const referencesIn = (manifest: Fields): readonly string[] =>
  pipe(
    Rec.values(manifest),
    Arr.flatMap((section) => pipe(fieldsOf(section), Rec.toEntries, Arr.flatMap(referenceOf))),
  );

const versionsOf = (raw: string | undefined): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(raw),
    Option.map((listed) => pipe(Str.split(listed, VERSION_SEPARATOR), Arr.map(Str.trim))),
    Option.getOrElse((): readonly string[] => []),
  );

const isLocked =
  (keys: readonly string[]) =>
  (resolved: string): boolean =>
    pipe(
      keys,
      Arr.some((key) => key === resolved || Str.startsWith(`${resolved}(`)(key)),
    );

const hasPackage =
  (keys: readonly string[]) =>
  (name: string): boolean =>
    pipe(keys, Arr.some(Str.startsWith(`${name}@`)));

const lockedVersion =
  (keys: readonly string[], name: string) =>
  (version: string): boolean =>
    isLocked(keys)(`${name}@${version}`);

const resolvedIn =
  (keys: readonly string[]) =>
  (entry: string): boolean =>
    Str.includes(WILDCARD)(entry) ||
    pipe(
      Option.fromNullishOr(SCOPED_NAME.exec(entry)),
      Option.flatMap(({ groups }) => Option.fromUndefinedOr(groups)),
      Option.match({
        onNone: () => true,
        onSome: ({ name = "", versions }) =>
          Arr.match(versionsOf(versions), {
            onEmpty: () => hasPackage(keys)(name),
            onNonEmpty: Arr.some(lockedVersion(keys, name)),
          }),
      }),
    );

const lockedKeys = (root: string): Effect.Effect<Option.Option<readonly string[]>> =>
  Effect.tryPromise({
    try: () => readWantedLockfile(root, { ignoreIncompatible: false }),
    catch: (cause) => LockfileUnreadable.make({ root, reason: String(cause) }),
  }).pipe(
    Effect.map((lockfile) =>
      pipe(
        Option.fromNullishOr(lockfile),
        Option.flatMap(({ packages }) => Option.fromUndefinedOr(packages)),
        Option.map(Rec.keys),
      ),
    ),
    Effect.orElseSucceed(() => Option.none()),
  );

const usedReferences = Effect.fn("usedReferences")(function* usedReferences(
  root: string,
  settings: Fields,
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
  const fromManifests = pipe(
    Arr.getSomes(manifests),
    Arr.flatMap((text) => Option.toArray(decodeManifest(text))),
    Arr.flatMap(referencesIn),
  );
  const fromOverrides = pipe(
    fieldsOf(settings["overrides"]),
    Rec.toEntries,
    Arr.flatMap(referenceOf),
  );
  return new Set([...fromManifests, ...fromOverrides]);
});

const lineOf =
  (source: string) =>
  (needle: RegExp): number =>
    pipe(
      Str.split(source, "\n"),
      Arr.findFirstIndex((line) => needle.test(line)),
      Option.match({ onNone: () => FIRST_LINE, onSome: (index) => index + FIRST_LINE }),
    );

const quoted = (name: string): string =>
  Str.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`)(name);

const entryLine = (name: string): RegExp => new RegExp(`^\\s+["']?${quoted(name)}["']?:`, "u");

const excludeLine = (entry: string): RegExp =>
  new RegExp(`^\\s+-\\s+["']?${quoted(entry)}["']?\\s*$`, "u");

interface Located {
  readonly file: string;
  readonly at: (needle: RegExp) => number;
}

const problemAt =
  ({ file, at }: Located, rule: RuleName, message: string) =>
  (name: string, needle: RegExp): Problem => ({
    file,
    line: at(needle),
    column: FIRST_COLUMN,
    rule,
    message: `\`${name}\` ${message}`,
  });

const unusedIn = (
  located: Located,
  settings: Fields,
  isUsed: (reference: string) => boolean,
): readonly Problem[] =>
  pipe(
    catalogEntries(settings),
    Arr.filter(({ catalog, name }) => !isUsed(`${catalog}:${name}`)),
    Arr.map(({ name }) => problemAt(located, UNUSED_RULE, UNUSED_MESSAGE)(name, entryLine(name))),
  );

const staleIn = (
  located: Located,
  settings: Fields,
  keys: Option.Option<readonly string[]>,
): readonly Problem[] => {
  const excludes = Option.getOrElse(
    decodeStrings(settings["minimumReleaseAgeExclude"]),
    (): readonly string[] => [],
  );
  return pipe(
    Option.toArray(keys),
    Arr.flatMap((locked) =>
      pipe(
        excludes,
        Arr.filter((entry) => !resolvedIn(locked)(entry)),
      ),
    ),
    Arr.map((entry) => problemAt(located, STALE_RULE, STALE_MESSAGE)(entry, excludeLine(entry))),
  );
};

const findingsIn = Effect.fn("findingsIn")(function* findingsIn(
  root: string,
  file: string,
  settings: Fields,
) {
  const files = yield* RepositoryFiles;
  const read = yield* files.readFile(file);
  const located: Located = { file, at: lineOf(Option.getOrElse(read, () => "")) };
  const used = yield* usedReferences(root, settings);
  const keys = yield* lockedKeys(root);
  return [
    ...unusedIn(located, settings, (reference) => used.has(reference)),
    ...staleIn(located, settings, keys),
  ];
});

/** @internal */
export const checkCatalogEntries = Effect.fn("checkCatalogEntries")(function* checkCatalogEntries(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const manifest = yield* workspaceManifest(root);
  return yield* Option.match(manifest, {
    onNone: () => Effect.succeed<readonly Problem[]>([]),
    onSome: (settings) => findingsIn(root, files.join(root, WORKSPACE_FILE), fieldsOf(settings)),
  });
});
