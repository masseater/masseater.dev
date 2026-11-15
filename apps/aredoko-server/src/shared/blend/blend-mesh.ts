import { Array, Option, pipe } from "effect";

import { pointerAt, pointerBytes, viewOf } from "./blend-blocks.ts";
import type { Block } from "./blend-blocks.ts";
import {
  elementsOf,
  embedded,
  floatsOf,
  follow,
  instanceOf,
  intOf,
  resolve,
  textOf,
} from "./blend-structs.ts";
import type { BlendFile, Instance } from "./blend-structs.ts";

export type Color = readonly [red: number, green: number, blue: number];

export interface MeshData {
  readonly positions: Float32Array;
  readonly offsets: Int32Array;
  readonly corners: Int32Array;
  readonly materials: Int32Array;
  readonly colors: readonly Color[];
}

interface Counts {
  readonly vertices: number;
  readonly faces: number;
  readonly corners: number;
}

interface Faces {
  readonly offsets: Int32Array;
  readonly corners: Int32Array;
  readonly materials: Option.Option<Int32Array>;
}

interface Span {
  readonly start: number;
  readonly total: number;
  readonly material: number;
}

const FLOAT_BYTES = 4;
const INT_BYTES = 4;
const XYZ = 3;
const NONE = 0;
const NEXT = 1;
const ARRAY_STORAGE = 0;
const DEFAULT_SHADE = 0.8;
export const GRAY: Color = [DEFAULT_SHADE, DEFAULT_SHADE, DEFAULT_SHADE];

const VERTEX_DOMAIN = ["vdata", "vert_data"];
const FACE_DOMAIN = ["pdata", "face_data"];
const CORNER_DOMAIN = ["ldata", "corner_data"];

const countOf = (mesh: Instance, names: readonly string[]): number =>
  Option.getOrElse(intOf({ instance: mesh, names }), () => NONE);

const countsOf = (mesh: Instance): Counts => ({
  vertices: countOf(mesh, ["totvert", "verts_num"]),
  faces: countOf(mesh, ["totpoly", "faces_num"]),
  corners: countOf(mesh, ["totloop", "corners_num"]),
});

const floatArray = (file: BlendFile, block: Block, length: number): Option.Option<Float32Array> => {
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

const intArray = (file: BlendFile, block: Block, length: number): Option.Option<Int32Array> => {
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

const named =
  (name: string) =>
  (instance: Instance): boolean =>
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

const fromStorage = (mesh: Instance, name: string): Option.Option<Block> =>
  Option.gen(function* storageBlock() {
    const lookup = { instance: mesh, names: ["attribute_storage"] };
    const storage = yield* embedded({ lookup, structName: "AttributeStorage" });
    const block = yield* follow({ instance: storage, names: ["dna_attributes"] });
    const attributes = elementsOf({ file: mesh.file, block, structName: "Attribute" });
    return yield* storedData(yield* Array.findFirst(attributes, named(name)));
  });

const fromCustomData = (
  mesh: Instance,
  domain: readonly string[],
  name: string,
): Option.Option<Block> =>
  Option.gen(function* customDataBlock() {
    const lookup = { instance: mesh, names: domain };
    const data = yield* embedded({ lookup, structName: "CustomData" });
    const block = yield* follow({ instance: data, names: ["layers"] });
    const layers = elementsOf({ file: mesh.file, block, structName: "CustomDataLayer" });
    const layer = yield* Array.findFirst(layers, named(name));
    return yield* follow({ instance: layer, names: ["data"] });
  });

const attribute = (mesh: Instance, domain: readonly string[], name: string): Option.Option<Block> =>
  pipe(
    fromStorage(mesh, name),
    Option.orElse(() => fromCustomData(mesh, domain, name)),
  );

const legacyPositions = (mesh: Instance, counts: Counts): Option.Option<Float32Array> =>
  Option.gen(function* oldPositions() {
    const block = yield* follow({ instance: mesh, names: ["mvert"] });
    const vertices = elementsOf({ file: mesh.file, block, structName: "MVert" }).slice(
      NONE,
      counts.vertices,
    );
    if (vertices.length < counts.vertices) {
      return yield* Option.none();
    }
    const coordinates = yield* Option.all(
      pipe(
        vertices,
        Array.map((vertex) => floatsOf({ instance: vertex, names: ["co"] })),
      ),
    );
    return Float32Array.from(Array.flatten(coordinates));
  });

const positionsOf = (mesh: Instance, counts: Counts): Option.Option<Float32Array> =>
  pipe(
    attribute(mesh, VERTEX_DOMAIN, "position"),
    Option.flatMap((block) => floatArray(mesh.file, block, counts.vertices * XYZ)),
    Option.orElse(() => legacyPositions(mesh, counts)),
  );

const modernFaces = (mesh: Instance, counts: Counts): Option.Option<Faces> =>
  Option.gen(function* offsetFaces() {
    const names = ["poly_offset_indices", "face_offset_indices"];
    const offsetBlock = yield* follow({ instance: mesh, names });
    const offsets = yield* intArray(mesh.file, offsetBlock, counts.faces + NEXT);
    const cornerBlock = yield* attribute(mesh, CORNER_DOMAIN, ".corner_vert");
    const corners = yield* intArray(mesh.file, cornerBlock, counts.corners);
    return { offsets, corners, materials: Option.none() };
  });

const spanOf = (polygon: Instance): Option.Option<Span> =>
  Option.gen(function* polygonSpan() {
    const start = yield* intOf({ instance: polygon, names: ["loopstart"] });
    const total = yield* intOf({ instance: polygon, names: ["totloop"] });
    const material = countOf(polygon, ["mat_nr"]);
    return { start, total, material };
  });

const legacyCorners = (mesh: Instance): Option.Option<Int32Array> =>
  Option.gen(function* oldCorners() {
    const block = yield* follow({ instance: mesh, names: ["mloop"] });
    const loops = elementsOf({ file: mesh.file, block, structName: "MLoop" });
    const vertices = yield* Option.all(
      pipe(
        loops,
        Array.map((loop) => intOf({ instance: loop, names: ["v"] })),
      ),
    );
    return Int32Array.from(vertices);
  });

const legacyFaces = (mesh: Instance, counts: Counts): Option.Option<Faces> =>
  Option.gen(function* oldFaces() {
    const block = yield* follow({ instance: mesh, names: ["mpoly"] });
    const polygons = elementsOf({ file: mesh.file, block, structName: "MPoly" });
    const spans = yield* Option.all(Array.map(polygons.slice(NONE, counts.faces), spanOf));
    const offsets = new Int32Array(counts.faces + NEXT);
    for (const [index, { start, total }] of spans.entries()) {
      offsets.set([start, start + total], index);
    }
    const materials = Int32Array.from(spans, ({ material }) => material);
    const corners = yield* legacyCorners(mesh);
    return { offsets, corners, materials: Option.some(materials) };
  });

const materialsOf = (mesh: Instance, counts: Counts, faces: Faces): Int32Array =>
  pipe(
    faces.materials,
    Option.orElse(() =>
      pipe(
        attribute(mesh, FACE_DOMAIN, "material_index"),
        Option.flatMap((block) => intArray(mesh.file, block, counts.faces)),
      ),
    ),
    Option.getOrElse(() => new Int32Array(counts.faces)),
  );

const colorOf = (material: Instance): Option.Option<Color> =>
  Option.map(
    Option.all([
      floatsOf({ instance: material, names: ["r"] }),
      floatsOf({ instance: material, names: ["g"] }),
      floatsOf({ instance: material, names: ["b"] }),
    ]),
    ([[red = DEFAULT_SHADE], [green = DEFAULT_SHADE], [blue = DEFAULT_SHADE]]): Color => [
      red,
      green,
      blue,
    ],
  );

const slotColor = (mesh: Instance, list: Block, slot: number): Color => {
  const { bytes, layout } = mesh.file;
  const offset = list.data + slot * pointerBytes(layout);
  const address = pointerAt({ bytes, offset, layout });
  return pipe(
    resolve({ file: mesh.file, address, anchor: list.data }),
    Option.flatMap((block) => instanceOf({ file: mesh.file, block })),
    Option.flatMap(colorOf),
    Option.getOrElse(() => GRAY),
  );
};

const colorsOf = (mesh: Instance): readonly Color[] =>
  pipe(
    follow({ instance: mesh, names: ["mat"] }),
    Option.map((list) => {
      const slots = Math.min(
        countOf(mesh, ["totcol"]),
        Math.floor(list.length / pointerBytes(mesh.file.layout)),
      );
      return Array.makeBy(slots, (slot) => slotColor(mesh, list, slot));
    }),
    Option.getOrElse((): readonly Color[] => []),
  );

export const readMesh = (mesh: Instance): Option.Option<MeshData> =>
  Option.gen(function* meshData() {
    const counts = countsOf(mesh);
    if (counts.vertices <= NONE || counts.faces <= NONE) {
      return yield* Option.none();
    }
    const positions = yield* positionsOf(mesh, counts);
    const faces = yield* pipe(
      modernFaces(mesh, counts),
      Option.orElse(() => legacyFaces(mesh, counts)),
    );
    const materials = materialsOf(mesh, counts, faces);
    const { offsets, corners } = faces;
    return { positions, offsets, corners, materials, colors: colorsOf(mesh) };
  });
