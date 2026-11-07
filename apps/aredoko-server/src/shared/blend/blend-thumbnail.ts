import { Option, pipe } from "effect";

interface Thumbnail {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

interface Layout {
  readonly start: number;
  readonly little: boolean;
  readonly head: "small4" | "small8" | "large8";
}

interface Block {
  readonly code: string;
  readonly data: number;
  readonly length: number;
}

const MAGIC = "BLENDER";
const FILE_START = 0;
const CHAR = 1;
const LEGACY_HEADER = 12;
const LARGE_HEADER = 17;
const POINTER_4 = "_";
const POINTER_8 = "-";
const LITTLE = "v";
const THUMBNAIL = "TEST";
const RENDER_INFO = "REND";
const CODE_BYTES = 4;
const INT_BYTES = 4;
const CHANNELS = 4;
const MAX_SIDE = 1024;
const MIN_SIDE = 1;

const HEAD_BYTES = { small4: 20, small8: 24, large8: 32 } as const;
const HEAD_OF_POINTER: Readonly<Record<string, Layout["head"]>> = {
  [POINTER_4]: "small4",
  [POINTER_8]: "small8",
};
const LARGE_LENGTH_OFFSET = 16;

const POINTER_OFFSET = 7;
const ENDIAN_OFFSET = 8;
const LARGE_ENDIAN_OFFSET = 12;

const ascii = new TextDecoder("latin1");

const textAt = (bytes: Uint8Array, start: number, length: number): string =>
  ascii.decode(bytes.subarray(start, start + length));

const layoutOf = (bytes: Uint8Array): Option.Option<Layout> => {
  if (bytes.length < LARGE_HEADER || textAt(bytes, FILE_START, MAGIC.length) !== MAGIC) {
    return Option.none();
  }
  return pipe(
    Option.fromNullishOr(HEAD_OF_POINTER[textAt(bytes, POINTER_OFFSET, CHAR)]),
    Option.map((head): Layout => ({
      start: LEGACY_HEADER,
      little: textAt(bytes, ENDIAN_OFFSET, CHAR) === LITTLE,
      head,
    })),
    Option.orElse(() =>
      Option.some<Layout>({
        start: LARGE_HEADER,
        little: textAt(bytes, LARGE_ENDIAN_OFFSET, CHAR) === LITTLE,
        head: "large8",
      }),
    ),
  );
};

const viewOf = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const lengthAt = (bytes: Uint8Array, offset: number, layout: Layout): number => {
  const view = viewOf(bytes);
  if (layout.head === "large8") {
    return Number(view.getBigInt64(offset + LARGE_LENGTH_OFFSET, layout.little));
  }
  return view.getInt32(offset + CODE_BYTES, layout.little);
};

const blockAt = (bytes: Uint8Array, offset: number, layout: Layout): Option.Option<Block> => {
  const size = HEAD_BYTES[layout.head];
  if (offset + size > bytes.length) {
    return Option.none();
  }
  return Option.some({
    code: textAt(bytes, offset, CODE_BYTES),
    data: offset + size,
    length: lengthAt(bytes, offset, layout),
  });
};

const pixelsOf = (bytes: Uint8Array, block: Block, little: boolean): Option.Option<Thumbnail> => {
  const view = viewOf(bytes);
  if (block.data + INT_BYTES + INT_BYTES > bytes.length) {
    return Option.none();
  }
  const width = view.getInt32(block.data, little);
  const height = view.getInt32(block.data + INT_BYTES, little);
  const start = block.data + INT_BYTES + INT_BYTES;
  const end = start + width * height * CHANNELS;
  const valid =
    width >= MIN_SIDE &&
    height >= MIN_SIDE &&
    width <= MAX_SIDE &&
    height <= MAX_SIDE &&
    end <= bytes.length;
  return Option.liftPredicate({ width, height, rgba: bytes.slice(start, end) }, () => valid);
};

const findThumbnail = (
  bytes: Uint8Array,
  offset: number,
  layout: Layout,
): Option.Option<Thumbnail> =>
  pipe(
    blockAt(bytes, offset, layout),
    Option.flatMap((block) => {
      if (block.code === THUMBNAIL) {
        return pixelsOf(bytes, block, layout.little);
      }
      if (block.code !== RENDER_INFO) {
        return Option.none();
      }
      return findThumbnail(bytes, block.data + block.length, layout);
    }),
  );

const blendThumbnail = (bytes: Uint8Array): Option.Option<Thumbnail> =>
  pipe(
    layoutOf(bytes),
    Option.flatMap((layout) => findThumbnail(bytes, layout.start, layout)),
  );

export { blendThumbnail };
export type { Thumbnail };
