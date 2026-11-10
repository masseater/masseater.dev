import { Effect, Option, Array as Arr, Record as Rec, String as Str, pipe } from "effect";
import { gunzip, unzip } from "fflate";
import type { Unzipped } from "fflate";
import { parseTar } from "nanotar";

import type { Document, Reader, Unreadable } from "./parser.ts";
import type { ReadError } from "./read-error.ts";
import { readErrorOf } from "./read-error.ts";
import { BINARY, isBinary, partsInside, withUnreadable } from "./unreadable.ts";

interface Entry {
  readonly bytes: Uint8Array;
  readonly name: string;
}

type ReadEntry = (entry: Entry) => Effect.Effect<Document, ReadError>;

const FENCE = /`+/gu;

const SHORTEST_FENCE = 3;

const LONGER = 1;

const ARCHIVE_FORMATS = ["zip", "tar", "gzip"] as const;

const START = 0;

const METADATA = [
  { named: /(?:^|\/)\._[^/]*$/u, magic: "\u0000\u0005\u0016\u0007" },
  { named: /(?:^|\/)\.DS_Store$/u, magic: "\u0000\u0000\u0000\u0001Bud1" },
] as const;

const latin1 = new TextDecoder("latin1");

interface Section {
  readonly lines: readonly string[];
  readonly unreadable: readonly Unreadable[];
}

const isFile = (name: string): boolean => !Str.endsWith("/")(name);

const isMetadata = ({ name, bytes }: Entry): boolean =>
  pipe(
    METADATA,
    Arr.some(
      ({ named, magic }) =>
        named.test(name) && latin1.decode(bytes.subarray(START, magic.length)) === magic,
    ),
  );

const fenceFor = (text: string): string => {
  const runs = Array.from(Str.matchAll(FENCE)(text), ([run]) => run.length + LONGER);
  return Str.repeat(Math.max(SHORTEST_FENCE, ...runs))("`");
};

const binaryPartsOf = (name: string, unreadable: readonly Unreadable[]): readonly Unreadable[] => {
  if (
    pipe(
      unreadable,
      Arr.some((part) => part.name === name),
    )
  ) {
    return unreadable;
  }
  return [...unreadable, { name, reason: BINARY }];
};

const sectionOf = (name: string, document: Document): Section => {
  const { text, format } = document;
  const unreadable = partsInside(name)(document);
  if (isBinary(text)) {
    return { lines: [], unreadable: binaryPartsOf(name, unreadable) };
  }
  if (Str.trim(text) === "") {
    return { lines: [], unreadable };
  }
  const fence = fenceFor(text);
  return { lines: [`## ${name}`, `${fence}${format}\n${text}\n${fence}`], unreadable };
};

const sectionsOf =
  (read: ReadEntry) =>
  (entries: readonly Entry[]): Effect.Effect<Document> =>
    Effect.forEach(
      pipe(
        entries,
        Arr.filter((entry) => !isMetadata(entry)),
      ),
      ({ bytes, name }) =>
        read({ bytes, name }).pipe(
          Effect.map((document) => sectionOf(name, document)),
          Effect.catchTag("ReadError", ({ reason }) =>
            Effect.succeed<Section>({ lines: [], unreadable: [{ name, reason }] }),
          ),
        ),
      { concurrency: 1 },
    ).pipe(
      Effect.map((sections) => {
        const unreadable = pipe(
          sections,
          Arr.flatMap((section) => section.unreadable),
        );
        return withUnreadable(unreadable)({
          text: pipe(
            sections,
            Arr.flatMap(({ lines }) => lines),
            Arr.join("\n\n"),
          ),
          format: "markdown",
        });
      }),
    );

const settled = <Data>(cause: unknown, data: Data): Effect.Effect<Data, ReadError> =>
  Option.match(Option.fromNullishOr(cause), {
    onNone: () => Effect.succeed(data),
    onSome: () => Effect.fail(readErrorOf(cause)),
  });

const unzipped = (bytes: Uint8Array): Effect.Effect<Unzipped, ReadError> =>
  Effect.callback<Unzipped, ReadError>((resume) => {
    unzip(bytes, { filter: ({ name }) => isFile(name) }, (cause, files) => {
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
            if (type !== "file" || !isFile(name)) {
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
