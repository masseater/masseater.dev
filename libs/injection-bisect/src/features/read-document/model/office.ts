import { Array as Arr, Effect, Record } from "effect";
import { parseOffice } from "officeparser";

import type { Reader, ReadError } from "#/entities/document/index.ts";
import { readErrorOf } from "#/entities/document/index.ts";

const KINDS = {
  docx: [".docx", ".docm", ".dotx"],
  pptx: [".pptx", ".pptm", ".ppsx"],
  odt: [".odt", ".ott"],
  odp: [".odp", ".otp"],
  rtf: [".rtf"],
  epub: [".epub"],
} as const;

type Kind = keyof typeof KINDS;

const markdownOf = (bytes: Uint8Array, fileType: Kind): Effect.Effect<string, ReadError> =>
  Effect.tryPromise({
    try: () => parseOffice(bytes, { fileType }),
    catch: readErrorOf,
  }).pipe(
    Effect.flatMap((ast) =>
      Effect.tryPromise({
        try: () => ast.to("md"),
        catch: readErrorOf,
      }),
    ),
    Effect.map(({ value }) => value),
    Effect.withSpan("injection-bisect.office"),
  );

export const OFFICE_READERS: readonly Reader[] = Arr.map(
  Record.toEntries(KINDS),
  ([format, extensions]) => ({
    format,
    extensions,
    read: (bytes) =>
      markdownOf(bytes, format).pipe(Effect.map((text) => ({ text, format: "markdown" }))),
  }),
);
