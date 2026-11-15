import { Array, Effect, Schema, pipe } from "effect";

import type { Part } from "./blend-scene.ts";

interface View {
  readonly bytes: Uint8Array;
  readonly target: number;
}

interface Bounds {
  readonly min: readonly number[];
  readonly max: readonly number[];
}

interface Document {
  readonly views: readonly View[];
  readonly accessors: readonly object[];
  readonly materials: readonly object[];
  readonly meshes: readonly object[];
}

const GLB_VERSION = 2;
const HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const ALIGN = 4;
const SPACE = 0x20;
const FLOAT = 5126;
const UNSIGNED_INT = 5125;
const ARRAY_BUFFER = 34_962;
const ELEMENT_ARRAY_BUFFER = 34_963;
const TRIANGLES = 4;
const XYZ = 3;
const OPAQUE = 1;
const ROUGHNESS = 0.8;
const METALLIC = 0;
const NONE = 0;
const NEXT = 1;
const LITTLE = true;

const tagOf = (text: string): number =>
  new DataView(new TextEncoder().encode(text).buffer).getUint32(NONE, LITTLE);

const GLB_MAGIC = tagOf("glTF");
const JSON_CHUNK = tagOf("JSON");
const BIN_CHUNK = tagOf("BIN\0");

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const padded = (length: number): number => Math.ceil(length / ALIGN) * ALIGN;

const boundsOf = (positions: Float32Array): Bounds => {
  const min = Array.replicate(Infinity, XYZ);
  const max = Array.replicate(-Infinity, XYZ);
  for (const [index, value] of positions.entries()) {
    const axis = index % XYZ;
    min[axis] = Math.min(min[axis] ?? value, value);
    max[axis] = Math.max(max[axis] ?? value, value);
  }
  return { min, max };
};

const bytesOf = (array: Float32Array | Uint32Array): Uint8Array =>
  new Uint8Array(array.buffer, array.byteOffset, array.byteLength);

const materialOf = (color: readonly number[]): object => ({
  pbrMetallicRoughness: {
    baseColorFactor: [...color, OPAQUE],
    metallicFactor: METALLIC,
    roughnessFactor: ROUGHNESS,
  },
  doubleSided: true,
});

const documentOf = (parts: readonly Part[]): Document => {
  const views: View[] = [];
  const accessors: object[] = [];
  const materials: object[] = [];
  const meshes = pipe(
    parts,
    Array.map(({ positions, groups }) => {
      const position = accessors.length;
      const count = positions.length / XYZ;
      views.push({ bytes: bytesOf(positions), target: ARRAY_BUFFER });
      accessors.push({
        bufferView: position,
        componentType: FLOAT,
        count,
        type: "VEC3",
        ...boundsOf(positions),
      });
      const primitives = pipe(
        groups,
        Array.map(({ color, indices }) => {
          views.push({ bytes: bytesOf(indices), target: ELEMENT_ARRAY_BUFFER });
          accessors.push({
            bufferView: views.length - NEXT,
            componentType: UNSIGNED_INT,
            count: indices.length,
            type: "SCALAR",
          });
          materials.push(materialOf(color));
          const material = materials.length - NEXT;
          return {
            attributes: { POSITION: position },
            indices: accessors.length - NEXT,
            material,
            mode: TRIANGLES,
          };
        }),
      );
      return { primitives };
    }),
  );
  return { views, accessors, materials, meshes };
};

const offsetsOf = (views: readonly View[]): readonly [readonly number[], number] => {
  const [length, offsets] = Array.mapAccum(
    views,
    NONE,
    (offset, { bytes }) => [offset + padded(bytes.length), offset] as const,
  );
  return [offsets, length];
};

const jsonOf = (document: Document, offsets: readonly number[], length: number): object => ({
  asset: { version: "2.0", generator: "aredoko" },
  scene: NONE,
  scenes: [{ nodes: Array.makeBy(document.meshes.length, (index) => index) }],
  nodes: Array.makeBy(document.meshes.length, (mesh) => ({ mesh })),
  meshes: document.meshes,
  materials: document.materials,
  accessors: document.accessors,
  bufferViews: pipe(
    document.views,
    Array.map(({ bytes, target }, index) => ({
      buffer: NONE,
      byteOffset: offsets[index] ?? NONE,
      byteLength: bytes.length,
      target,
    })),
  ),
  buffers: [{ byteLength: length }],
});

const writeChunk = (
  glb: Uint8Array,
  { at, length, type }: Readonly<{ at: number; length: number; type: number }>,
): void => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  view.setUint32(at, length, LITTLE);
  view.setUint32(at + ALIGN, type, LITTLE);
};

const writeHeader = (glb: Uint8Array): void => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  view.setUint32(NONE, GLB_MAGIC, LITTLE);
  view.setUint32(ALIGN, GLB_VERSION, LITTLE);
  view.setUint32(ALIGN + ALIGN, glb.length, LITTLE);
};

const assemble = (
  document: Document,
  text: Uint8Array,
  [offsets, length]: readonly [readonly number[], number],
): Uint8Array => {
  const json = padded(text.length);
  const binary = HEADER_BYTES + CHUNK_HEADER_BYTES + json;
  const glb = new Uint8Array(binary + CHUNK_HEADER_BYTES + length);
  writeHeader(glb);
  writeChunk(glb, { at: HEADER_BYTES, length: json, type: JSON_CHUNK });
  glb
    .fill(SPACE, HEADER_BYTES + CHUNK_HEADER_BYTES, binary)
    .set(text, HEADER_BYTES + CHUNK_HEADER_BYTES);
  writeChunk(glb, { at: binary, length, type: BIN_CHUNK });
  for (const [index, { bytes }] of document.views.entries()) {
    glb.set(bytes, binary + CHUNK_HEADER_BYTES + (offsets[index] ?? NONE));
  }
  return glb;
};

export const glbOf = Effect.fn("glbOf")(function* glbOf(parts: readonly Part[]) {
  const document = documentOf(parts);
  const layout = offsetsOf(document.views);
  const [offsets, length] = layout;
  const json = yield* encodeJson(jsonOf(document, offsets, length));
  return assemble(document, new TextEncoder().encode(json), layout);
});
