import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import semver from "semver";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import { workspaceManifest } from "#/entities/workspace/index.ts";
import { groupOf } from "#/shared/lib/match-groups.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "version-range";
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const ALIAS = /^npm:(?:@[^/@]+\/)?[^@]+@(?<version>.+)$/u;
const PROTOCOL = /^[a-z+]+:/u;
const PATH_LIKE = "/";
const START = 0;
const SECTIONS = ["dependencies", "devDependencies", "optionalDependencies"] as const;
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];
const MESSAGE =
  "is a range. The lockfile decides the version anyway, so a range only lets the next install move it without a diff. Write the exact version the lockfile resolves; `msch-publish` widens `dependencies` and `peerDependencies` to `^` in the published package.";

type Fields = Readonly<Record<string, unknown>>;

const FieldsSchema = Schema.Record(Schema.String, Schema.Unknown);
const decodeFields = Schema.decodeUnknownOption(FieldsSchema);
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(FieldsSchema));
const decodeString = Schema.decodeUnknownOption(Schema.String);

const fieldsOf = (value: unknown): Fields => Option.getOrElse(decodeFields(value), () => ({}));

const versionOf = (specifier: string): string =>
  Option.getOrElse(groupOf("version")(ALIAS.exec(specifier)), () => specifier);

/** @internal */
export const isRange = (specifier: string): boolean => {
  const version = versionOf(specifier);
  return (
    !PROTOCOL.test(version) && !Str.includes(PATH_LIKE)(version) && semver.valid(version) === null
  );
};

interface Specified {
  readonly name: string;
  readonly specifier: string;
}

const specifiedIn = (held: unknown): readonly Specified[] =>
  pipe(
    fieldsOf(held),
    Rec.toEntries,
    Arr.flatMap(([name, value]) =>
      pipe(
        decodeString(value),
        Option.map((specifier) => ({ name, specifier })),
        Option.toArray,
      ),
    ),
  );

const quoted = (text: string): string =>
  Str.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`)(text);

const offsetIn =
  (source: string) =>
  (pattern: RegExp): number =>
    pipe(
      Option.fromNullishOr(pattern.exec(source)),
      Option.map(({ index }) => index),
      Option.getOrElse(() => START),
    );

const problemsFor =
  (file: string, source: string, pattern: (found: Specified) => RegExp) =>
  (found: readonly Specified[]): readonly Problem[] =>
    pipe(
      found,
      Arr.filter(({ specifier }) => isRange(specifier)),
      Arr.map((range): Problem => ({
        file,
        ...positionOf(source)(offsetIn(source)(pattern(range))),
        rule: RULE,
        message: `\`${range.name}\` \`${range.specifier}\` ${MESSAGE}`,
      })),
    );

const manifestPattern = ({ name, specifier }: Specified): RegExp =>
  new RegExp(`"${quoted(name)}"\\s*:\\s*"${quoted(specifier)}"`, "u");

const catalogPattern = ({ name }: Specified): RegExp =>
  new RegExp(`^\\s+["']?${quoted(name)}["']?:`, "mu");

const manifestProblems = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    decodeManifest(source),
    Option.map((manifest) =>
      pipe(
        SECTIONS,
        Arr.flatMap((section) => specifiedIn(manifest[section])),
        problemsFor(entry.file, source, manifestPattern),
      ),
    ),
    Option.getOrElse((): readonly Problem[] => []),
  );

const catalogSpecifiers = (settings: Fields): readonly Specified[] => [
  ...specifiedIn(settings["catalog"]),
  ...pipe(fieldsOf(settings["catalogs"]), Rec.values, Arr.flatMap(specifiedIn)),
];

const catalogProblems = Effect.fn("catalogProblems")(function* catalogProblems(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, WORKSPACE_FILE);
  const settings = yield* workspaceManifest(root);
  const source = yield* files.readFile(file);
  return pipe(
    Option.all({ settings, source }),
    Option.map(({ settings: held, source: text }) =>
      problemsFor(file, text, catalogPattern)(catalogSpecifiers(fieldsOf(held))),
    ),
    Option.getOrElse((): readonly Problem[] => []),
  );
});

/** @internal */
export const checkExactVersions = Effect.fn("checkExactVersions")(function* checkExactVersions(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const manifests = yield* files.matchingFiles(root, [`:(glob)**/${MANIFEST_FILE}`, ...EXCLUDED]);
  const listed = pipe(
    manifests,
    Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
  );
  const fromManifests = yield* scanText(listed, manifestProblems);
  const fromCatalogs = yield* catalogProblems(root);
  return [...fromManifests, ...fromCatalogs];
});
