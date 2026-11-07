import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { fileTypeFromBuffer } from "file-type";

import { ARCHIVE_FORMATS, archiveReadersOf } from "./archive.ts";
import type { Document, Parser, Reader } from "./parser.ts";
import { DEFAULT_PARSERS } from "./parsers.ts";
import { ReadError } from "./read-error.ts";
import { DEFAULT_READERS } from "./readers.ts";
import { AUTO, isNamed, plainParser } from "./segment.ts";

const NOT_FOUND = -1;

interface Formats {
  readonly parsers?: readonly Parser[];
  readonly readers?: readonly Reader[];
}

interface ReadInput extends Formats {
  readonly bytes: Uint8Array;
  readonly format?: string;
  readonly name?: string;
}

const decoder = new TextDecoder();

const extensionOf = (name: string): string =>
  pipe(
    name,
    Str.lastIndexOf("."),
    Option.match({
      onNone: () => "",
      onSome: (dot) => pipe(name, Str.slice(dot), Str.toLowerCase),
    }),
  );

const parsersOf = ({ parsers = DEFAULT_PARSERS }: Formats): readonly Parser[] => [
  ...parsers,
  plainParser,
];

const readersOf = ({ readers = DEFAULT_READERS }: Formats): readonly Reader[] => readers;

const archivesOf = <Archive>(
  formats: Formats,
  archives: readonly Archive[],
): readonly Archive[] => {
  if (Arr.isReadonlyArrayEmpty(readersOf(formats))) {
    return [];
  }
  return archives;
};

const formatsOf = (formats: Formats = {}): readonly string[] => [
  AUTO,
  ...pipe(
    parsersOf(formats),
    Arr.map(({ format }) => format),
  ),
  ...pipe(
    readersOf(formats),
    Arr.map(({ format }) => format),
  ),
  ...archivesOf(formats, ARCHIVE_FORMATS),
];

const named = (input: ReadInput, format: string): Effect.Effect<Document, ReadError> =>
  Option.match(
    Arr.findFirst(readersOf(input), (reader) => reader.format === format),
    {
      onSome: (reader) => reader.read(input.bytes),
      onNone: () =>
        Option.match(Arr.findFirst(parsersOf(input), isNamed(format)), {
          onSome: (parser) =>
            Effect.succeed({ text: decoder.decode(input.bytes), format: parser.format }),
          onNone: () => Effect.fail(ReadError.make({ reason: `unknown format: ${format}` })),
        }),
    },
  );

const withExtension =
  (names: readonly string[]) =>
  ({ extensions }: { readonly extensions: readonly string[] }): boolean =>
    pipe(
      names,
      Arr.some((name) => extensions.includes(name)),
    );

const sniffed = (bytes: Uint8Array): Effect.Effect<readonly string[]> =>
  Effect.promise(() => fileTypeFromBuffer(bytes)).pipe(
    Effect.map((type) =>
      Option.toArray(Option.map(Option.fromNullishOr(type), ({ ext }) => `.${ext}`)),
    ),
  );

const accepting =
  (bytes: Uint8Array) =>
  ({ accepts }: Reader): boolean =>
    Option.exists(Option.fromNullishOr(accepts), (accept) => accept(bytes));

const detected = (input: ReadInput): Effect.Effect<Document, ReadError> =>
  Effect.gen(function* detect() {
    const name = input.name ?? "";
    const slash = Option.getOrElse(Str.lastIndexOf("/")(name), () => NOT_FOUND);
    const fileName = pipe(name, Str.slice(slash + "/".length), Str.toLowerCase);
    const candidates = [...readersOf(input), ...parsersOf(input)];
    const byName = Arr.findFirst(candidates, withExtension([extensionOf(name), fileName]));
    const signature = yield* sniffed(input.bytes);
    const bySignature = Arr.findFirst(candidates, withExtension(signature));
    const byContent = Arr.findFirst(readersOf(input), accepting(input.bytes));
    return yield* Option.match(Option.firstSomeOf([byName, bySignature, byContent]), {
      onSome: ({ format }) => named(input, format),
      onNone: () => Effect.succeed({ text: decoder.decode(input.bytes), format: AUTO }),
    });
  });

const readDocument = (input: ReadInput): Effect.Effect<Document, ReadError> => {
  const archiveReaders = archiveReadersOf(({ bytes, name }) =>
    readDocument({ ...input, bytes, name, format: AUTO }),
  );
  const withArchive = {
    ...input,
    readers: [...readersOf(input), ...archivesOf(input, archiveReaders)],
  };
  const format = input.format ?? AUTO;
  if (format === AUTO) {
    return detected(withArchive);
  }
  return named(withArchive, format);
};

export { formatsOf, readDocument };
export type { Formats, ReadInput };
