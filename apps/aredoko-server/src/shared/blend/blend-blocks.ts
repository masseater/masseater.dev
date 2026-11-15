import { Option, pipe } from "effect";

interface Layout {
  readonly start: number;
  readonly little: boolean;
  readonly head: "small4" | "small8" | "large8";
}

interface Block {
  readonly code: string;
  readonly data: number;
  readonly length: number;
  readonly address: bigint;
  readonly struct: number;
  readonly count: number;
}

interface Located {
  readonly bytes: Uint8Array;
  readonly offset: number;
  readonly layout: Layout;
}

interface Header {
  readonly length: number;
  readonly address: bigint;
  readonly struct: number;
  readonly count: number;
}

const MAGIC = "BLENDER";
const FILE_START = 0;
const CHAR = 1;
const LEGACY_HEADER = 12;
const LARGE_HEADER = 17;
const POINTER_4 = "_";
const POINTER_8 = "-";
const LITTLE = "v";
const CODE_BYTES = 4;
const END = "ENDB";

const HEAD_BYTES = { small4: 20, small8: 24, large8: 32 } as const;
const POINTER_BYTES = { small4: 4, small8: 8, large8: 8 } as const;
const HEAD_OF_POINTER: Readonly<Record<string, Layout["head"]>> = {
  [POINTER_4]: "small4",
  [POINTER_8]: "small8",
};

const SMALL_LENGTH = 4;
const SMALL_ADDRESS = 8;
const LARGE_STRUCT = 4;
const LARGE_ADDRESS = 8;
const LARGE_LENGTH = 16;
const LARGE_COUNT = 24;

const POINTER_OFFSET = 7;
const ENDIAN_OFFSET = 8;
const LARGE_ENDIAN_OFFSET = 12;

const ascii = new TextDecoder("latin1");

const textAt = ({
  bytes,
  start,
  length,
}: Readonly<{ bytes: Uint8Array; start: number; length: number }>): string =>
  ascii.decode(bytes.subarray(start, start + length));

const viewOf = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const charAt = (bytes: Uint8Array, start: number): string => textAt({ bytes, start, length: CHAR });

const layoutOf = (bytes: Uint8Array): Option.Option<Layout> => {
  if (
    bytes.length < LARGE_HEADER ||
    textAt({ bytes, start: FILE_START, length: MAGIC.length }) !== MAGIC
  ) {
    return Option.none();
  }
  return pipe(
    Option.fromNullishOr(HEAD_OF_POINTER[charAt(bytes, POINTER_OFFSET)]),
    Option.map((head): Layout => ({
      start: LEGACY_HEADER,
      little: charAt(bytes, ENDIAN_OFFSET) === LITTLE,
      head,
    })),
    Option.orElse(() =>
      Option.some<Layout>({
        start: LARGE_HEADER,
        little: charAt(bytes, LARGE_ENDIAN_OFFSET) === LITTLE,
        head: "large8",
      }),
    ),
  );
};

const pointerBytes = (layout: Layout): number => POINTER_BYTES[layout.head];

const pointerAt = ({ bytes, offset, layout }: Located): bigint => {
  const view = viewOf(bytes);
  if (pointerBytes(layout) === POINTER_BYTES.small4) {
    return BigInt(view.getUint32(offset, layout.little));
  }
  return view.getBigUint64(offset, layout.little);
};

const largeHeader = ({ bytes, offset, layout }: Located): Header => {
  const view = viewOf(bytes);
  return {
    struct: view.getUint32(offset + LARGE_STRUCT, layout.little),
    address: view.getBigUint64(offset + LARGE_ADDRESS, layout.little),
    length: Number(view.getBigInt64(offset + LARGE_LENGTH, layout.little)),
    count: Number(view.getBigInt64(offset + LARGE_COUNT, layout.little)),
  };
};

const smallHeader = ({ bytes, offset, layout }: Located): Header => {
  const view = viewOf(bytes);
  const after = offset + SMALL_ADDRESS + pointerBytes(layout);
  return {
    length: view.getInt32(offset + SMALL_LENGTH, layout.little),
    address: pointerAt({ bytes, offset: offset + SMALL_ADDRESS, layout }),
    struct: view.getUint32(after, layout.little),
    count: view.getInt32(after + CODE_BYTES, layout.little),
  };
};

const headerAt = (located: Located): Header => {
  if (located.layout.head === "large8") {
    return largeHeader(located);
  }
  return smallHeader(located);
};

const blockAt = (located: Located): Option.Option<Block> => {
  const { bytes, offset, layout } = located;
  const size = HEAD_BYTES[layout.head];
  if (offset < FILE_START || offset + size > bytes.length) {
    return Option.none();
  }
  const code = textAt({ bytes, start: offset, length: CODE_BYTES });
  return Option.some({ code, data: offset + size, ...headerAt(located) });
};

const isReadable = (bytes: Uint8Array, block: Block): boolean =>
  block.code !== END && block.length >= FILE_START && block.data + block.length <= bytes.length;

const blocksOf = ({
  bytes,
  layout,
}: Readonly<{ bytes: Uint8Array; layout: Layout }>): readonly Block[] => {
  const blocks: Block[] = [];
  let next = blockAt({ bytes, offset: layout.start, layout });
  while (Option.isSome(next) && isReadable(bytes, next.value)) {
    const block = next.value;
    blocks.push(block);
    next = blockAt({ bytes, offset: block.data + block.length, layout });
  }
  return blocks;
};

export { blockAt, blocksOf, layoutOf, pointerAt, pointerBytes, textAt, viewOf };
export type { Block, Layout, Located };
