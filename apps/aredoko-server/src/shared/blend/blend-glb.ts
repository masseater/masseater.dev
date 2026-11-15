import { Array, Effect, Option, Schema, pipe } from "effect";
import type { HashMap } from "effect";

import { documentOf } from "./blend-gltf.ts";
import type { Document, View } from "./blend-gltf.ts";
import type { Part } from "./blend-scene.ts";

const GLB_VERSION = 2;
const HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const ALIGN = 4;
const SPACE = 0x20;
const NONE = 0;
const LITTLE = true;

const tagOf = (text: string): number =>
  new DataView(new TextEncoder().encode(text).buffer).getUint32(NONE, LITTLE);

const GLB_MAGIC = tagOf("glTF");
const JSON_CHUNK = tagOf("JSON");
const BIN_CHUNK = tagOf("BIN\0");

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const padded = (length: number): number => Math.ceil(length / ALIGN) * ALIGN;

const offsetsOf = (views: readonly View[]): readonly [readonly number[], number] => {
  const [length, offsets] = Array.mapAccum(
    views,
    NONE,
    (offset, { bytes }) => [offset + padded(bytes.length), offset] as const,
  );
  return [offsets, length];
};

const optional = (key: string, values: readonly object[]): object =>
  Array.match(values, { onEmpty: () => ({}), onNonEmpty: (items) => ({ [key]: items }) });

const bufferViewOf = ({ bytes, target }: View, byteOffset: number): object => ({
  buffer: NONE,
  byteOffset,
  byteLength: bytes.length,
  ...Option.match(target, { onNone: () => ({}), onSome: (value) => ({ target: value }) }),
});

const jsonOf = (document: Document, offsets: readonly number[], length: number): object => ({
  asset: { version: "2.0", generator: "aredoko" },
  scene: NONE,
  scenes: [{ nodes: Array.makeBy(document.meshes.length, (index) => index) }],
  nodes: Array.makeBy(document.meshes.length, (mesh) => ({ mesh })),
  meshes: document.meshes,
  materials: document.materials,
  ...optional("images", document.images),
  ...optional("textures", document.textures),
  ...optional(
    "samplers",
    Array.match(document.textures, { onEmpty: () => [], onNonEmpty: () => [{}] }),
  ),
  accessors: document.accessors,
  bufferViews: pipe(
    document.views,
    Array.map((view, index) => bufferViewOf(view, offsets[index] ?? NONE)),
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

const glbOf = Effect.fn("glbOf")(function* glbOf(
  parts: readonly Part[],
  pngs: HashMap.HashMap<number, Uint8Array>,
) {
  const document = documentOf({ parts, pngs });
  const layout = offsetsOf(document.views);
  const [offsets, length] = layout;
  const json = yield* encodeJson(jsonOf(document, offsets, length));
  return assemble(document, new TextEncoder().encode(json), layout);
});

export { glbOf };
