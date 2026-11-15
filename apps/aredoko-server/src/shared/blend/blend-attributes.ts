import { Array, Option, pipe } from "effect";

import { viewOf } from "./blend-blocks.ts";
import type { Block } from "./blend-blocks.ts";
import { elementsOf, embedded, follow, intOf, textOf } from "./blend-structs.ts";
import type { BlendFile, Instance } from "./blend-structs.ts";

export type Matches = (attribute: Instance) => boolean;

export interface Sized {
  readonly file: BlendFile;
  readonly block: Block;
  readonly length: number;
}

export interface Search {
  readonly mesh: Instance;
  readonly domain: readonly string[];
  readonly matches: Matches;
}

const FLOAT_BYTES = 4;
const INT_BYTES = 4;
const ARRAY_STORAGE = 0;

export const VERTEX_DOMAIN = ["vdata", "vert_data"];
export const FACE_DOMAIN = ["pdata", "face_data"];
export const CORNER_DOMAIN = ["ldata", "corner_data"];

export const floatArray = ({ file, block, length }: Sized): Option.Option<Float32Array> => {
  if (block.length < length * FLOAT_BYTES) {
    return Option.none();
  }
  const view = viewOf(file.bytes);
  const values = new Float32Array(length);
  for (const index of values.keys()) {
    values[index] = view.getFloat32(block.data + index * FLOAT_BYTES, file.layout.little);
  }
  return Option.some(values);
};

export const intArray = ({ file, block, length }: Sized): Option.Option<Int32Array> => {
  if (block.length < length * INT_BYTES) {
    return Option.none();
  }
  const view = viewOf(file.bytes);
  const values = new Int32Array(length);
  for (const index of values.keys()) {
    values[index] = view.getInt32(block.data + index * INT_BYTES, file.layout.little);
  }
  return Option.some(values);
};

export const named =
  (name: string): Matches =>
  (instance) =>
    Option.getOrElse(
      Option.map(textOf({ instance, names: ["name"] }), (text) => text === name),
      () => false,
    );

const storageOf = (attribute: Instance): string => {
  const storage = Option.getOrElse(
    intOf({ instance: attribute, names: ["storage_type"] }),
    () => ARRAY_STORAGE,
  );
  if (storage === ARRAY_STORAGE) {
    return "AttributeArray";
  }
  return "AttributeSingle";
};

const storedData = (attribute: Instance): Option.Option<Block> =>
  Option.gen(function* storedBlock() {
    const block = yield* follow({ instance: attribute, names: ["data"] });
    const structName = storageOf(attribute);
    const inner = yield* Array.head(elementsOf({ file: attribute.file, block, structName }));
    return yield* follow({ instance: inner, names: ["data"] });
  });

const fromStorage = (mesh: Instance, matches: Matches): Option.Option<Block> =>
  Option.gen(function* storageBlock() {
    const lookup = { instance: mesh, names: ["attribute_storage"] };
    const storage = yield* embedded({ lookup, structName: "AttributeStorage" });
    const block = yield* follow({ instance: storage, names: ["dna_attributes"] });
    const attributes = elementsOf({ file: mesh.file, block, structName: "Attribute" });
    return yield* storedData(yield* Array.findFirst(attributes, matches));
  });

const fromCustomData = ({ mesh, domain, matches }: Search): Option.Option<Block> =>
  Option.gen(function* customDataBlock() {
    const lookup = { instance: mesh, names: domain };
    const data = yield* embedded({ lookup, structName: "CustomData" });
    const block = yield* follow({ instance: data, names: ["layers"] });
    const layers = elementsOf({ file: mesh.file, block, structName: "CustomDataLayer" });
    const layer = yield* Array.findFirst(layers, matches);
    return yield* follow({ instance: layer, names: ["data"] });
  });

export const attribute = (search: Search): Option.Option<Block> =>
  pipe(
    fromStorage(search.mesh, search.matches),
    Option.orElse(() => fromCustomData(search)),
  );
