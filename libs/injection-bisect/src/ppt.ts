import { Effect, Option, Array as Arr, String as Str, pipe } from "effect";

import { hasStream, streamOf, utf16le, viewOf } from "./cfb.ts";
import type { Reader } from "./parser.ts";

const STREAM = "PowerPoint Document";

const HEADER = 8;

const TYPE = 2;

const LENGTH = 4;

const VERSIONS = 16;

const CONTAINER = 15;

const NONE = 0;

const LITTLE_ENDIAN = true;

const latin1 = new TextDecoder("latin1");

const ATOM = { textChars: 4000, textBytes: 4008, cString: 4026 } as const;

const DECODERS = new Map<number, TextDecoder>([
  [ATOM.textChars, utf16le],
  [ATOM.cString, utf16le],
  [ATOM.textBytes, latin1],
]);

interface Atom {
  readonly next: number;
  readonly text: readonly string[];
}

const atomAt =
  (stream: Uint8Array) =>
  (position: number): Atom => {
    const view = viewOf(stream);
    const version = view.getUint16(position, LITTLE_ENDIAN) % VERSIONS;
    const length = view.getUint32(position + LENGTH, LITTLE_ENDIAN);
    const body = position + HEADER;
    const text = Option.fromNullishOr(
      DECODERS.get(view.getUint16(position + TYPE, LITTLE_ENDIAN)),
    ).pipe(
      Option.map((decoder) => decoder.decode(stream.subarray(body, body + length))),
      Option.toArray,
    );
    if (version === CONTAINER) {
      return { next: body, text };
    }
    return { next: body + length, text };
  };

const textsOf = (stream: Uint8Array): readonly string[] => {
  const atom = atomAt(stream);
  const texts: string[] = [];
  let position = NONE;
  while (position + HEADER <= stream.length) {
    const { next, text } = atom(position);
    texts.push(...text);
    position = next;
  }
  return texts;
};

const tidied = (text: string): string =>
  pipe(text, Str.replaceAll("\r", "\n"), Str.replaceAll("\u000B", "\n"), Str.trim);

const pptReader: Reader = {
  format: "ppt",
  extensions: [".ppt", ".pps", ".pot"],
  accepts: hasStream((name) => name === STREAM),
  read: (bytes) =>
    streamOf(bytes)(STREAM).pipe(
      Effect.map((document) => ({
        text: pipe(
          textsOf(document),
          Arr.map((text) => tidied(text)),
          Arr.filter((text) => text !== ""),
          Arr.join("\n\n"),
        ),
        format: "plain",
      })),
    ),
};

export { pptReader };
