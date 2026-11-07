import { Effect, Option, Array as Arr, Record as Rec, String as Str, pipe } from "effect";
import { gunzip, unzip } from "fflate";
import type { Unzipped } from "fflate";
import { parseTar } from "nanotar";

import type { Document, Reader } from "./parser.ts";
import type { ReadError } from "./read-error.ts";
import { readErrorOf } from "./read-error.ts";

interface Entry {
  readonly bytes: Uint8Array;
  readonly name: string;
}

type ReadEntry = (entry: Entry) => Effect.Effect<Document, ReadError>;

const FENCE = /`+/gu;

const SHORTEST_FENCE = 3;

const LONGER = 1;

const ARCHIVE_FORMATS = ["zip", "tar", "gzip"] as const;

const NUL = "\0";

const SKIPPED = ["__MACOSX/", ".DS_Store"];

const kept = (name: string): boolean =>
  !Str.endsWith("/")(name) &&
  !pipe(
    SKIPPED,
    Arr.some((skipped) => Str.includes(skipped)(name)),
  );

const fenceFor = (text: string): string => {
  const runs = Array.from(Str.matchAll(FENCE)(text), ([run]) => run.length + LONGER);
  return Str.repeat(Math.max(SHORTEST_FENCE, ...runs))("`");
};

const sectionOf = (name: string, { text, format }: Document): readonly string[] => {
  if (Str.includes(NUL)(text) || Str.trim(text) === "") {
    return [];
  }
  const fence = fenceFor(text);
  return [`## ${name}`, `${fence}${format}\n${text}\n${fence}`];
};

const sectionsOf =
  (read: ReadEntry) =>
  (entries: readonly Entry[]): Effect.Effect<Document> =>
    Effect.forEach(
      entries,
      ({ bytes, name }) =>
        read({ bytes, name }).pipe(
          Effect.map((document) => sectionOf(name, document)),
          Effect.orElseSucceed((): readonly string[] => []),
        ),
      { concurrency: 1 },
    ).pipe(
      Effect.map((sections) => ({
        text: pipe(sections.flat(), Arr.join("\n\n")),
        format: "markdown",
      })),
    );

const settled = <Data>(cause: unknown, data: Data): Effect.Effect<Data, ReadError> =>
  Option.match(Option.fromNullishOr(cause), {
    onNone: () => Effect.succeed(data),
    onSome: () => Effect.fail(readErrorOf(cause)),
  });

const unzipped = (bytes: Uint8Array): Effect.Effect<Unzipped, ReadError> =>
  Effect.callback<Unzipped, ReadError>((resume) => {
    unzip(bytes, { filter: ({ name }) => kept(name) }, (cause, files) => {
      resume(settled(cause, files));
    });
  });

const gunzipped = (bytes: Uint8Array): Effect.Effect<Uint8Array, ReadError> =>
  Effect.callback<Uint8Array, ReadError>((resume) => {
    gunzip(bytes, (cause, data) => {
      resume(settled(cause, data));
    });
  });

const archiveReadersOf = (read: ReadEntry): readonly Reader[] => [
  {
    format: "zip",
    extensions: [".zip"],
    read: (bytes) =>
      unzipped(bytes).pipe(
        Effect.map((files) =>
          pipe(
            Rec.toEntries(files),
            Arr.map(([name, data]) => ({ name, bytes: data })),
          ),
        ),
        Effect.flatMap(sectionsOf(read)),
      ),
  },
  {
    format: "tar",
    extensions: [".tar"],
    read: (bytes) =>
      sectionsOf(read)(
        pipe(
          parseTar(bytes),
          Arr.flatMap(({ name, type, data }) => {
            if (type !== "file" || !kept(name)) {
              return [];
            }
            return Option.toArray(
              Option.map(Option.fromNullishOr(data), (body) => ({ name, bytes: body })),
            );
          }),
        ),
      ),
  },
  {
    format: "gzip",
    extensions: [".gz", ".tgz", ".tar.gz"],
    read: (bytes) =>
      gunzipped(bytes).pipe(Effect.flatMap((inner) => read({ bytes: inner, name: "" }))),
  },
];

export { ARCHIVE_FORMATS, archiveReadersOf };
export type { Entry, ReadEntry };
