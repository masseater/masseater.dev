import { Array, HashMap, Option, pipe } from "effect";

import type { Surface } from "./blend-material.ts";
import type { Group, Part } from "./blend-scene.ts";

interface View {
  readonly bytes: Uint8Array;
  readonly target: Option.Option<number>;
}

interface Document {
  readonly views: readonly View[];
  readonly accessors: readonly object[];
  readonly materials: readonly object[];
  readonly meshes: readonly object[];
  readonly images: readonly object[];
  readonly textures: readonly object[];
}

type Kind = "accessors" | "materials" | "images" | "textures";

interface Store {
  readonly add: (kind: Kind, value: object) => number;
  readonly view: (view: View) => number;
  readonly texture: (key: number) => Option.Option<number>;
  readonly document: (meshes: readonly object[]) => Document;
}

interface Attributes {
  readonly POSITION: number;
  readonly TEXCOORD_0?: number;
}

interface Vertices {
  readonly attributes: Attributes;
  readonly textured: boolean;
}

const FLOAT = 5126;
const UNSIGNED_INT = 5125;
const ARRAY_BUFFER = 34_962;
const ELEMENT_ARRAY_BUFFER = 34_963;
const TRIANGLES = 4;
const XYZ = 3;
const UV = 2;
const OPAQUE = 1;
const WHITE = 1;
const ROUGHNESS = 0.8;
const METALLIC = 0;
const NEXT = 1;
const SAMPLER = 0;
const PNG = "image/png";

const bytesOf = (array: Float32Array | Uint32Array): Uint8Array =>
  new Uint8Array(array.buffer, array.byteOffset, array.byteLength);

const boundsOf = (positions: Float32Array): Readonly<{ min: number[]; max: number[] }> => {
  const min = Array.replicate(Infinity, XYZ);
  const max = Array.replicate(-Infinity, XYZ);
  for (const [index, value] of positions.entries()) {
    const axis = index % XYZ;
    min[axis] = Math.min(min[axis] ?? value, value);
    max[axis] = Math.max(max[axis] ?? value, value);
  }
  return { min, max };
};

const storeOf = (pngs: HashMap.HashMap<number, Uint8Array>): Store => {
  const views: View[] = [];
  const lists: Record<Kind, object[]> = { accessors: [], materials: [], images: [], textures: [] };
  const cached = new Map<number, number>();
  const add = (kind: Kind, value: object): number => lists[kind].push(value) - NEXT;
  const view = (entry: View): number => views.push(entry) - NEXT;
  const created = (key: number, png: Uint8Array): number => {
    const bufferView = view({ bytes: png, target: Option.none() });
    const source = add("images", { bufferView, mimeType: PNG });
    const index = add("textures", { source, sampler: SAMPLER });
    cached.set(key, index);
    return index;
  };
  const texture = (key: number): Option.Option<number> =>
    pipe(
      Option.fromNullishOr(cached.get(key)),
      Option.orElse(() => Option.map(HashMap.get(pngs, key), (png) => created(key, png))),
    );
  const document = (meshes: readonly object[]): Document => ({ views, ...lists, meshes });
  return { add, view, texture, document };
};

const materialOf = (store: Store, surface: Surface, textured: boolean): number => {
  const texture = pipe(
    surface.image,
    Option.filter(() => textured),
    Option.flatMap(({ key }) => store.texture(key)),
  );
  const color = Option.match(texture, {
    onNone: () => surface.color,
    onSome: () => Array.replicate(WHITE, XYZ),
  });
  return store.add("materials", {
    pbrMetallicRoughness: {
      baseColorFactor: [...color, OPAQUE],
      ...Option.match(texture, {
        onNone: () => ({}),
        onSome: (index) => ({ baseColorTexture: { index } }),
      }),
      metallicFactor: METALLIC,
      roughnessFactor: ROUGHNESS,
    },
    doubleSided: true,
  });
};

const primitiveOf = (
  store: Store,
  { attributes, textured }: Vertices,
  { surface, indices }: Group,
): object => {
  const bufferView = store.view({
    bytes: bytesOf(indices),
    target: Option.some(ELEMENT_ARRAY_BUFFER),
  });
  const accessor = store.add("accessors", {
    bufferView,
    componentType: UNSIGNED_INT,
    count: indices.length,
    type: "SCALAR",
  });
  const material = materialOf(store, surface, textured);
  return { attributes, indices: accessor, material, mode: TRIANGLES };
};

const vertexAccessor = (store: Store, values: Float32Array, width: number): number => {
  const bufferView = store.view({ bytes: bytesOf(values), target: Option.some(ARRAY_BUFFER) });
  const type = `VEC${width.toString()}`;
  const count = values.length / width;
  const bounds = Option.match(
    Option.liftPredicate(width, (size) => size === XYZ),
    {
      onNone: () => ({}),
      onSome: () => boundsOf(values),
    },
  );
  return store.add("accessors", { bufferView, componentType: FLOAT, count, type, ...bounds });
};

const meshOf = (store: Store, { positions, uvs, groups }: Part): object => {
  const position = vertexAccessor(store, positions, XYZ);
  const vertices: Vertices = Option.match(uvs, {
    onNone: () => ({ attributes: { POSITION: position }, textured: false }),
    onSome: (coordinates) => ({
      attributes: { POSITION: position, TEXCOORD_0: vertexAccessor(store, coordinates, UV) },
      textured: true,
    }),
  });
  return {
    primitives: pipe(
      groups,
      Array.map((group) => primitiveOf(store, vertices, group)),
    ),
  };
};

const documentOf = ({
  parts,
  pngs,
}: Readonly<{ parts: readonly Part[]; pngs: HashMap.HashMap<number, Uint8Array> }>): Document => {
  const store = storeOf(pngs);
  const meshes = pipe(
    parts,
    Array.map((part) => meshOf(store, part)),
  );
  return store.document(meshes);
};

export { documentOf };
export type { Document, View };
