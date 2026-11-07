import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import { hasFlag, hasStream, streamOf, utf16le, viewOf } from "./cfb.ts";
import type { Reader } from "./parser.ts";

const WORD_DOCUMENT = "WordDocument";

const FIB = { flags: 10, fcClx: 418, lcbClx: 422 } as const;

const TABLE_1 = 512;

const usesTable1 = hasFlag(TABLE_1);

const PRC = 1;

const PCDT = 2;

const COMPRESSED = 1_073_741_824;

const isCompressed = hasFlag(COMPRESSED);

const NONE = 0;

const BYTE = 1;

const SHORT = 2;

const LONG = 4;

const PIECE = 8;

const PIECE_FC = 2;

const LITTLE_ENDIAN = true;

const FIELD = { begin: "\u0013", separator: "\u0014", end: "\u0015" } as const;

const CELL_END = "\u0007";

const LAST_CONTROL = 31;

const KEPT_CONTROLS = new Set(["\t", "\n"]);

const windows1252 = new TextDecoder("windows-1252");

interface Piece {
  readonly length: number;
  readonly fc: number;
}

const tableName = (word: DataView): string => {
  if (usesTable1(word.getUint16(FIB.flags, LITTLE_ENDIAN))) {
    return "1Table";
  }
  return "0Table";
};

const pcdtStart = (clx: DataView): number => {
  let position = NONE;
  while (position < clx.byteLength && clx.getUint8(position) === PRC) {
    position += BYTE + SHORT + clx.getInt16(position + BYTE, LITTLE_ENDIAN);
  }
  return position;
};

const pieceAt =
  (clx: DataView, { plc, count }: { readonly plc: number; readonly count: number }) =>
  (index: number): Piece => {
    const cp = clx.getUint32(plc + index * LONG, LITTLE_ENDIAN);
    const next = clx.getUint32(plc + (index + BYTE) * LONG, LITTLE_ENDIAN);
    const descriptor = plc + (count + BYTE) * LONG + index * PIECE;
    return { length: next - cp, fc: clx.getUint32(descriptor + PIECE_FC, LITTLE_ENDIAN) };
  };

const piecesOf = (clx: DataView): readonly Piece[] => {
  const start = pcdtStart(clx);
  if (start >= clx.byteLength || clx.getUint8(start) !== PCDT) {
    return [];
  }
  const count = (clx.getUint32(start + BYTE, LITTLE_ENDIAN) - LONG) / (LONG + PIECE);
  const piece = pieceAt(clx, { plc: start + BYTE + LONG, count });
  return Array.from({ length: count }, (_piece, index) => piece(index));
};

const pieceText =
  (word: Uint8Array) =>
  ({ length, fc }: Piece): string => {
    if (!isCompressed(fc)) {
      return utf16le.decode(word.subarray(fc, fc + length * SHORT));
    }
    const start = (fc % COMPRESSED) / SHORT;
    return windows1252.decode(word.subarray(start, start + length));
  };

const afterInstruction = (field: string): string => {
  const stops = pipe(
    [
      { at: Str.indexOf(FIELD.separator)(field), skip: FIELD.separator.length },
      { at: Str.indexOf(FIELD.end)(field), skip: NONE },
    ],
    Arr.map(({ at, skip }) => at.pipe(Option.map((index) => index + skip))),
    Arr.getSomes,
  );
  const first = Arr.head(Arr.sort(stops, Order.Number));
  return Str.slice(Option.getOrElse(first, () => NONE))(field);
};

const withoutFieldCodes = (text: string): string => {
  const [first, ...fields] = Str.split(FIELD.begin)(text);
  return pipe(
    [
      first,
      ...pipe(
        fields,
        Arr.map((field) => afterInstruction(field)),
      ),
    ],
    Arr.join(""),
  );
};

const isShown = (letter: string): boolean =>
  KEPT_CONTROLS.has(letter) ||
  Option.getOrElse(Str.codePointAt(NONE)(letter), () => NONE) > LAST_CONTROL;

const cleaned = (text: string): string => {
  const normalized = pipe(
    withoutFieldCodes(text),
    Str.replaceAll(CELL_END, "\t"),
    Str.replaceAll(/[\r\v\f]/gu, "\n"),
  );
  return pipe(
    Array.from(normalized, (letter) => letter),
    Arr.filter((letter) => isShown(letter)),
    Arr.join(""),
    Str.trim,
  );
};

const textOf = (word: Uint8Array, table: Uint8Array): string => {
  const fib = viewOf(word);
  const fcClx = fib.getUint32(FIB.fcClx, LITTLE_ENDIAN);
  const clx = viewOf(table.subarray(fcClx, fcClx + fib.getUint32(FIB.lcbClx, LITTLE_ENDIAN)));
  return cleaned(
    pipe(
      piecesOf(clx),
      Arr.map((piece) => pieceText(word)(piece)),
      Arr.join(""),
    ),
  );
};

const docReader: Reader = {
  format: "doc",
  extensions: [".doc", ".dot"],
  accepts: hasStream((name) => name === WORD_DOCUMENT),
  read: (bytes) =>
    Effect.gen(function* doc() {
      const stream = streamOf(bytes);
      const word = yield* stream(WORD_DOCUMENT);
      const table = yield* stream(tableName(viewOf(word)));
      return { text: textOf(word, table), format: "plain" };
    }),
};

export { docReader };
