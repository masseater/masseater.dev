import {
  Array as Arr,
  Effect,
  Option,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { resolveConfigFromFile } from "vite-plus";

import { MANIFEST_FILE } from "./dependencies.ts";
import { RepositoryFiles } from "./repository-files.ts";

const CONFIG_FILE = "vite.config.ts";
const SEPARATOR = "/";
const READ_CONCURRENCY = 16;
const SOURCE_EXTENSION = /\.[cm]?tsx?$/u;
const BYTE = 1;
const KILOBYTE = 1000;
const MEGABYTE = 1_000_000;
const UNIT_BYTES = [
  ["B", BYTE],
  ["kB", KILOBYTE],
  ["MB", MEGABYTE],
] as const;

const SizeText = Schema.TemplateLiteralParser([
  Schema.Finite,
  " ",
  Schema.Literals(["B", "kB", "MB"]),
]);
const PackEntry = Schema.Union([
  Schema.String,
  Schema.Array(Schema.String),
  Schema.Record(Schema.String, Schema.String),
]);
const PackSettings = Schema.Struct({ entry: Schema.optional(PackEntry) });
const PackList = Schema.Union([PackSettings, Schema.Array(PackSettings)]);
const isEntryList = Schema.is(Schema.Array(Schema.String));
const WorkspaceConfig = Schema.Struct({
  msch: Schema.Struct({ publish: Schema.Struct({ installSize: SizeText }) }),
  pack: Schema.optional(PackList),
});
const PublicManifest = Schema.Struct({ private: Schema.optional(Schema.Literal(false)) });

const taggedError = Schema.TaggedError;

class WorkspaceConfigUnreadable extends taggedError<
  WorkspaceConfigUnreadable,
  { readonly brand: unique symbol }
>()("WorkspaceConfigUnreadable", { file: Schema.String }) {}

interface PackEntrySource {
  readonly name: string;
  readonly source: string;
}

interface PublishedWorkspace {
  readonly directory: string;
  readonly configFile: string;
  readonly installSize: string;
  readonly installBudget: number;
  readonly packEntries: readonly PackEntrySource[];
}

const bytesPer = (unit: string): number =>
  pipe(
    UNIT_BYTES,
    Arr.findFirst(([name]) => name === unit),
    Option.map(([, bytes]) => bytes),
    Option.getOrElse(() => Number.NaN),
  );

const nameOf = (source: string): string =>
  pipe(
    Str.split(source, SEPARATOR),
    Arr.last,
    Option.getOrElse(() => source),
    Str.replace(SOURCE_EXTENSION, ""),
  );

const entriesOf = (entry: typeof PackEntry.Type): readonly PackEntrySource[] => {
  if (Predicate.isString(entry)) {
    return [{ name: nameOf(entry), source: entry }];
  }
  if (isEntryList(entry)) {
    return pipe(
      entry,
      Arr.map((source) => ({ name: nameOf(source), source })),
    );
  }
  return pipe(
    Rec.toEntries(entry),
    Arr.map(([name, source]) => ({ name, source })),
  );
};

const packEntriesOf = (pack: typeof WorkspaceConfig.Type.pack): readonly PackEntrySource[] =>
  pipe(
    Option.fromUndefinedOr(pack),
    Option.map(Arr.ensure),
    Option.getOrElse((): readonly (typeof PackSettings.Type)[] => []),
    Arr.flatMap((setting) =>
      pipe(
        Option.fromUndefinedOr(setting.entry),
        Option.match({ onNone: () => [], onSome: entriesOf }),
      ),
    ),
  );

const settingsIn = Effect.fn("settingsIn")(function* settingsIn(file: string) {
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => WorkspaceConfigUnreadable.make({ file }),
  }).pipe(Effect.option);
  return pipe(config, Option.flatMap(Schema.decodeUnknownOption(WorkspaceConfig)));
});

const isPublicPackage = Effect.fn("isPublicPackage")(function* isPublicPackage(directory: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(directory, MANIFEST_FILE));
  return Option.exists(text, (found) =>
    Option.isSome(Schema.decodeOption(Schema.fromJsonString(PublicManifest))(found)),
  );
});

const workspaceOf =
  (directory: string, configFile: string, join: (source: string) => string) =>
  ({ msch, pack }: typeof WorkspaceConfig.Type): PublishedWorkspace => {
    const [amount, , unit] = msch.publish.installSize;
    return {
      directory,
      configFile,
      installSize: `${amount} ${unit}`,
      installBudget: amount * bytesPer(unit),
      packEntries: pipe(
        packEntriesOf(pack),
        Arr.map((entry) => ({ name: entry.name, source: join(entry.source) })),
      ),
    };
  };

const publishedIn = Effect.fn("publishedIn")(function* publishedIn(
  root: string,
  configName: string,
) {
  const files = yield* RepositoryFiles;
  const configFile = files.join(root, configName);
  const directory = files.dirname(configFile);
  const isPublic = yield* isPublicPackage(directory);
  if (!isPublic) {
    return Option.none<PublishedWorkspace>();
  }
  const settings = yield* settingsIn(configFile);
  return pipe(
    settings,
    Option.map(workspaceOf(directory, configFile, (source) => files.join(directory, source))),
  );
});

/** @internal */
const publishedWorkspaces = Effect.fn("publishedWorkspaces")(function* publishedWorkspaces(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const configs = pipe(
    names,
    Arr.filter((name) => files.basename(name) === CONFIG_FILE && Str.includes(SEPARATOR)(name)),
  );
  const found = yield* Effect.forEach(configs, (name) => publishedIn(root, name), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

export { publishedWorkspaces };
export type { PackEntrySource, PublishedWorkspace };
