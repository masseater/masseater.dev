import { Array, HashMap, Option, Record, pipe } from "effect";

import { blocksOf, layoutOf, pointerAt, viewOf } from "./blend-blocks.ts";
import type { Block, Layout } from "./blend-blocks.ts";
import { dnaOf } from "./blend-dna.ts";
import type { Dna, Field, Struct } from "./blend-dna.ts";

interface BlendFile {
  readonly bytes: Uint8Array;
  readonly layout: Layout;
  readonly blocks: readonly Block[];
  readonly dna: Dna;
  readonly addresses: HashMap.HashMap<bigint, readonly Block[]>;
}

interface Instance {
  readonly file: BlendFile;
  readonly struct: Struct;
  readonly offset: number;
}

interface Lookup {
  readonly instance: Instance;
  readonly names: readonly string[];
}

const NULL_ADDRESS = 0n;
const FLOAT_BYTES = 4;
const INT_BYTES = 4;
const SHORT_BYTES = 2;
const NUL = 0;
const MAX_ITEMS = 1_000_000;

const addressesOf = (blocks: readonly Block[]): HashMap.HashMap<bigint, readonly Block[]> =>
  pipe(
    blocks,
    Array.groupBy(({ address }) => address.toString()),
    Record.values,
    Array.map((group): readonly [bigint, readonly Block[]] => [
      Array.headNonEmpty(group).address,
      group,
    ]),
    HashMap.fromIterable,
  );

const openBlend = (bytes: Uint8Array): Option.Option<BlendFile> =>
  Option.gen(function* open() {
    const layout = yield* layoutOf(bytes);
    const blocks = blocksOf({ bytes, layout });
    const dna = yield* dnaOf({ bytes, blocks, layout });
    return { bytes, layout, blocks, dna, addresses: addressesOf(blocks) };
  });

const structNamed = (file: BlendFile, name: string): Option.Option<Struct> =>
  HashMap.get(file.dna.structs, name);

const structOfBlock = (file: BlendFile, block: Block): Option.Option<Struct> =>
  pipe(
    Array.get(file.dna.typeOf, block.struct),
    Option.flatMap((name) => structNamed(file, name)),
  );

const fieldOf = ({ instance, names }: Lookup): Option.Option<Field> =>
  pipe(
    names,
    Array.findFirst((name) => HashMap.get(instance.struct.fields, name)),
  );

const placeOf = (lookup: Lookup): Option.Option<number> =>
  Option.map(fieldOf(lookup), ({ offset }) => lookup.instance.offset + offset);

const view = (instance: Instance): DataView => viewOf(instance.file.bytes);

const floatsOf = (lookup: Lookup): Option.Option<readonly number[]> =>
  Option.flatMap(fieldOf(lookup), ({ offset, size, pointer }) => {
    if (pointer) {
      return Option.none();
    }
    const start = lookup.instance.offset + offset;
    const { little } = lookup.instance.file.layout;
    return Option.some(
      Array.makeBy(size / FLOAT_BYTES, (index) =>
        view(lookup.instance).getFloat32(start + index * FLOAT_BYTES, little),
      ),
    );
  });

const intOf = (lookup: Lookup): Option.Option<number> =>
  Option.flatMap(fieldOf(lookup), ({ offset, size }) => {
    const at = lookup.instance.offset + offset;
    const { little } = lookup.instance.file.layout;
    if (size === INT_BYTES) {
      return Option.some(view(lookup.instance).getInt32(at, little));
    }
    if (size === SHORT_BYTES) {
      return Option.some(view(lookup.instance).getInt16(at, little));
    }
    return Option.some(view(lookup.instance).getInt8(at));
  });

const addressOf = (lookup: Lookup): bigint =>
  pipe(
    placeOf(lookup),
    Option.map((offset) =>
      pointerAt({ bytes: lookup.instance.file.bytes, offset, layout: lookup.instance.file.layout }),
    ),
    Option.getOrElse(() => NULL_ADDRESS),
  );

const resolve = ({
  file,
  address,
  anchor,
}: Readonly<{ file: BlendFile; address: bigint; anchor: number }>): Option.Option<Block> => {
  if (address === NULL_ADDRESS) {
    return Option.none();
  }
  return pipe(
    HashMap.get(file.addresses, address),
    Option.flatMap((blocks) =>
      pipe(
        blocks,
        Array.findFirst(({ data }) => data >= anchor),
        Option.orElse(() => Array.head(blocks)),
      ),
    ),
  );
};

const follow = (lookup: Lookup): Option.Option<Block> =>
  resolve({
    file: lookup.instance.file,
    address: addressOf(lookup),
    anchor: lookup.instance.offset,
  });

const instanceOf = ({
  file,
  block,
}: Readonly<{ file: BlendFile; block: Block }>): Option.Option<Instance> =>
  Option.map(structOfBlock(file, block), (struct) => ({ file, struct, offset: block.data }));

const embedded = ({
  lookup,
  structName,
}: Readonly<{ lookup: Lookup; structName: string }>): Option.Option<Instance> =>
  Option.gen(function* embed() {
    const offset = yield* placeOf(lookup);
    const struct = yield* structNamed(lookup.instance.file, structName);
    return { file: lookup.instance.file, struct, offset };
  });

const elementsOf = ({
  file,
  block,
  structName,
}: Readonly<{ file: BlendFile; block: Block; structName: string }>): readonly Instance[] =>
  pipe(
    structNamed(file, structName),
    Option.filter(({ size }) => size > NUL),
    Option.map((struct) =>
      Array.makeBy(Math.floor(block.length / struct.size), (index) => ({
        file,
        struct,
        offset: block.data + index * struct.size,
      })),
    ),
    Option.getOrElse((): readonly Instance[] => []),
  );

const utf8 = new TextDecoder();

const cString = (bytes: Uint8Array, start: number, length: number): string => {
  const window = bytes.subarray(start, start + length);
  const end = window.indexOf(NUL);
  if (end < NUL) {
    return utf8.decode(window);
  }
  return utf8.decode(window.subarray(NUL, end));
};

const textOf = (lookup: Lookup): Option.Option<string> =>
  Option.flatMap(fieldOf(lookup), ({ offset, size, pointer }) => {
    const { bytes } = lookup.instance.file;
    const start = lookup.instance.offset + offset;
    if (pointer) {
      return Option.map(follow(lookup), (block) => cString(bytes, block.data, block.length));
    }
    return Option.some(cString(bytes, start, size));
  });

const linkedAt = (file: BlendFile, offset: number): Option.Option<Instance> =>
  Option.flatMap(
    resolve({
      file,
      address: pointerAt({ bytes: file.bytes, offset, layout: file.layout }),
      anchor: offset,
    }),
    (block) => instanceOf({ file, block }),
  );

const listOf = (lookup: Lookup): readonly Instance[] => {
  const { file } = lookup.instance;
  const items: Instance[] = [];
  let current = Option.flatMap(placeOf(lookup), (offset) => linkedAt(file, offset));
  while (Option.isSome(current) && items.length < MAX_ITEMS) {
    items.push(current.value);
    current = linkedAt(file, current.value.offset);
  }
  return items;
};

export {
  elementsOf,
  embedded,
  floatsOf,
  follow,
  instanceOf,
  intOf,
  listOf,
  openBlend,
  resolve,
  textOf,
};
export type { BlendFile, Instance, Lookup };
