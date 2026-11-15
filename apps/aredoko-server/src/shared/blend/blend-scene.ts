import { Array, Option, String, pipe } from "effect";
import { Matrix4, Vector3 } from "three";

import { surfaceOf } from "./blend-material.ts";
import type { Surface } from "./blend-material.ts";
import { readMesh } from "./blend-mesh.ts";
import type { MeshData } from "./blend-mesh.ts";
import { modifiedMesh } from "./blend-modifiers.ts";
import { follow, instanceOf, intOf } from "./blend-structs.ts";
import type { BlendFile, Instance } from "./blend-structs.ts";
import { worldMatrix } from "./blend-transform.ts";

export interface Group {
  readonly surface: Surface;
  readonly indices: Uint32Array;
}

export interface Part {
  readonly positions: Float32Array;
  readonly uvs: Option.Option<Float32Array>;
  readonly groups: readonly Group[];
}

const OBJECT = "OB";
const MESH_TYPE = 1;
const HIDE_RENDER = 4;
const BIT = 2;
const SOLID = 3;
const NONE = 0;
const NEXT = 1;
const TRIANGLE = 3;
const XYZ = 3;
const QUARTER_TURN = -Math.PI / BIT;
const Z_UP_TO_Y_UP = new Matrix4().makeRotationX(QUARTER_TURN);

const isShown = (object: Instance): boolean => {
  const names = ["visibility_flag", "restrictflag"];
  const hidden = Option.getOrElse(intOf({ instance: object, names }), () => NONE);
  const display = Option.getOrElse(intOf({ instance: object, names: ["dt"] }), () => SOLID);
  return Math.floor(hidden / HIDE_RENDER) % BIT === NONE && display >= SOLID;
};

const transformed = (positions: Float32Array, elements: readonly number[]): Float32Array => {
  const world = Z_UP_TO_Y_UP.clone().multiply(new Matrix4().fromArray(elements));
  const point = new Vector3();
  const result = new Float32Array(positions.length);
  for (const start of Array.makeBy(positions.length / XYZ, (index) => index * XYZ)) {
    point.fromArray(positions, start).applyMatrix4(world).toArray(result, start);
  }
  return result;
};

const vertexOf = (mesh: MeshData, corner: number): number => mesh.corners[corner] ?? -NEXT;

const trianglesOf = (mesh: MeshData, face: number): readonly number[] => {
  const start = mesh.offsets[face] ?? NONE;
  const total = Math.max((mesh.offsets[face + NEXT] ?? NONE) - start, NONE);
  const vertices = mesh.positions.length / XYZ;
  const valid = pipe(
    Array.makeBy(total, (index) => vertexOf(mesh, start + index)),
    Array.every((vertex) => vertex >= NONE && vertex < vertices),
  );
  if (!valid || total < TRIANGLE) {
    return [];
  }
  return pipe(
    Array.makeBy(total - TRIANGLE + NEXT, (index) => index + NEXT),
    Array.flatMap((index) => [start, start + index, start + index + NEXT]),
  );
};

const groupsOf = (mesh: MeshData): readonly Group[] => {
  const slots = Math.max(mesh.slots.length, NEXT);
  const buckets = Array.makeBy(slots, (): number[] => []);
  for (const [face, material] of mesh.materials.entries()) {
    const slot = Math.min(Math.max(material, NONE), slots - NEXT);
    Option.map(Array.get(buckets, slot), (bucket) => bucket.push(...trianglesOf(mesh, face)));
  }
  return pipe(
    buckets,
    Array.map((indices, slot) => ({
      surface: surfaceOf(Option.flatten(Array.get(mesh.slots, slot))),
      indices: Uint32Array.from(indices),
    })),
    Array.filter(({ indices }) => indices.length > NONE),
  );
};

const expanded = (mesh: MeshData): Float32Array => {
  const result = new Float32Array(mesh.corners.length * XYZ);
  for (const [corner, vertex] of mesh.corners.entries()) {
    result.set(mesh.positions.subarray(vertex * XYZ, vertex * XYZ + XYZ), corner * XYZ);
  }
  return result;
};

const partOf =
  (withHidden: boolean) =>
  (object: Instance): Option.Option<Part> =>
    Option.gen(function* objectPart() {
      const type = yield* intOf({ instance: object, names: ["type"] });
      if (type !== MESH_TYPE || !(withHidden || isShown(object))) {
        return yield* Option.none();
      }
      const data = yield* Option.flatMap(follow({ instance: object, names: ["data"] }), (block) =>
        instanceOf({ file: object.file, block }),
      );
      const base = yield* readMesh(data);
      const mesh = modifiedMesh({ object, mesh: base });
      const groups = yield* Option.liftPredicate(groupsOf(mesh), Array.isReadonlyArrayNonEmpty);
      const positions = transformed(expanded(mesh), worldMatrix(object).toArray());
      return { positions, uvs: mesh.uvs, groups };
    });

const partsOf = (file: BlendFile, withHidden: boolean): readonly Part[] =>
  pipe(
    file.blocks,
    Array.filter(({ code }) => pipe(code, String.startsWith(OBJECT))),
    Array.map((block) => Option.flatMap(instanceOf({ file, block }), partOf(withHidden))),
    Array.getSomes,
  );

export const sceneOf = (file: BlendFile): readonly Part[] =>
  Array.match(partsOf(file, false), {
    onEmpty: () => partsOf(file, true),
    onNonEmpty: (parts) => parts,
  });
