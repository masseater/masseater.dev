import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { getStaticTOMLValue, parseTOML } from "toml-eslint-parser";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { MANIFEST_FILE } from "./cargo-metadata.ts";

const WORKSPACE = "workspace";
const PROFILE = "profile";
const PACKAGE = "package";
const MEMBER_LISTS = new Set(["members", "exclude", "default-members"]);
const EVERY_PACKAGE = "*";
const VERSION_MARK = "@";
const URL_MARK = "/";

type Table = Readonly<Record<string, unknown>>;

const taggedError = Schema.TaggedError;

class ManifestUnreadable extends taggedError<
  ManifestUnreadable,
  { readonly brand: unique symbol }
>()("ManifestUnreadable", { file: Schema.String }) {}

const ManifestJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));
const decodeManifest = Schema.decodeUnknownOption(ManifestJson);
const encodeManifest = Schema.encodeOption(ManifestJson);
const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));
const decodeTable = Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown));

const mapTable =
  (change: (table: Table) => Table) =>
  (value: unknown): unknown =>
    pipe(
      decodeTable(value),
      Option.map(change),
      Option.getOrElse(() => value),
    );

const mapField =
  (name: string, change: (value: unknown) => unknown) =>
  (table: Table): Table => {
    if (!Rec.has(table, name)) {
      return table;
    }
    return { ...table, [name]: change(table[name]) };
  };

const nameOf = (spec: string): string => Arr.headNonEmpty(Str.split(spec, VERSION_MARK));

const overrides =
  (closure: readonly string[]) =>
  (spec: string): boolean =>
    spec === EVERY_PACKAGE ||
    Str.includes(URL_MARK)(spec) ||
    pipe(closure, Arr.contains(nameOf(spec)));

const withoutMembers = (workspace: Table): Table =>
  pipe(
    workspace,
    Rec.filter((_value, key) => !MEMBER_LISTS.has(key)),
  );

const keptOverrides = (closure: readonly string[]): ((packages: unknown) => unknown) => {
  const applies = overrides(closure);
  return mapTable((packages) =>
    pipe(
      packages,
      Rec.filter((_value, spec) => applies(spec)),
    ),
  );
};

const profilesFor = (closure: readonly string[]): ((profiles: unknown) => unknown) => {
  const profileFor = mapTable(mapField(PACKAGE, keptOverrides(closure)));
  return mapTable(Rec.map(profileFor));
};

const withoutMemberLists = mapField(WORKSPACE, mapTable(withoutMembers));

export const readManifest = Effect.fn("readManifest")(function* readManifest(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, MANIFEST_FILE);
  const text = yield* files.readFile(file);
  const value = yield* Effect.try({
    try: () =>
      text.pipe(
        Option.getOrElse(() => ""),
        parseTOML,
        getStaticTOMLValue,
      ),
    catch: () => ManifestUnreadable.make({ file }),
  });
  return yield* encodeJson(value);
});

export const manifestFor =
  (closure: readonly string[]) =>
  (manifest: string): string => {
    const forClosure = mapField(PROFILE, profilesFor(closure));
    return pipe(
      decodeManifest(manifest),
      Option.map(withoutMemberLists),
      Option.map(forClosure),
      Option.flatMap(encodeManifest),
      Option.getOrElse(() => manifest),
    );
  };
