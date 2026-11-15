import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { MANIFEST_FILE, publicEntriesOf, PackEntry, entriesOf } from "#/entities/package/index.ts";
import type { EntryManifest, PackEntrySource } from "#/entities/package/index.ts";
import { literalOf, nestedValues } from "#/entities/workspace/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const PACK_ENTRY = ["pack", "entry"] as const;

const Manifest = Schema.Struct({
  name: Schema.optional(Schema.String),
  exports: Schema.optional(Schema.Unknown),
  bin: Schema.optional(Schema.Unknown),
});
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));
const decodePackEntry = Schema.decodeUnknownOption(PackEntry);

const packEntriesIn = (program: unknown): readonly PackEntrySource[] =>
  pipe(
    nestedValues(PACK_ENTRY)(program),
    Arr.flatMap((node) =>
      pipe(
        literalOf(node),
        Option.flatMap(decodePackEntry),
        Option.toArray,
        Arr.flatMap(entriesOf),
      ),
    ),
  );

interface EntryFilesRequest {
  readonly join: (target: string) => string;
  readonly packEntries: readonly PackEntrySource[];
}

const entryFilesOf =
  ({ join, packEntries }: EntryFilesRequest) =>
  (manifest: EntryManifest): readonly string[] => {
    const joined = pipe(
      packEntries,
      Arr.map((entry) => ({ name: entry.name, source: join(entry.source) })),
    );
    return pipe(
      publicEntriesOf({ manifest, join, packEntries: joined }),
      Arr.map(({ source }) => source),
      Arr.dedupe,
    );
  };

export const publicEntryFiles = Effect.fn("publicEntryFiles")(function* publicEntryFiles(
  root: string,
  directory: string,
  config: Option.Option<unknown>,
) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, directory, MANIFEST_FILE));
  const packEntries = pipe(
    config,
    Option.map(packEntriesIn),
    Option.getOrElse(() => []),
  );
  const join = (target: string): string => files.join(directory, target);
  return pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.map(entryFilesOf({ join, packEntries })),
    Option.getOrElse((): readonly string[] => []),
  );
});
