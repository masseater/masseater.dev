import { Array, Option, String, pipe } from "effect";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { EulerOrder } from "three";

import { GRAY, readMesh } from "./blend-mesh.ts";
import type { Color, MeshData } from "./blend-mesh.ts";
import { floatsOf, follow, instanceOf, intOf } from "./blend-structs.ts";
import type { BlendFile, Instance } from "./blend-structs.ts";

interface Group {
  readonly color: Color;
  readonly indices: Uint32Array;
}

interface Part {
  readonly positions: Float32Array;
  readonly groups: readonly Group[];
}

const OBJECT = "OB";
const MESH_TYPE = 1;
const HIDE_RENDER = 4;
const BIT = 2;
const SOLID = 3;
const QUATERNION_MODE = 0;
const AXIS_ANGLE_MODE = -1;
const XYZ_EULER_MODE = 1;
const NONE = 0;
const NEXT = 1;
const TRIANGLE = 3;
const XYZ = 3;
const MAX_DEPTH = 64;
const UNIT = 1;
const QUARTER_TURN = -Math.PI / BIT;
const IDENTITY: readonly number[] = Array.replicate(UNIT, XYZ);
const ORIGIN: readonly number[] = Array.replicate(NONE, XYZ);
const UP: readonly number[] = [NONE, UNIT, NONE];
const Z_UP_TO_Y_UP = new Matrix4().makeRotationX(QUARTER_TURN);

const EULER_ORDERS: Readonly<Record<number, EulerOrder>> = {
  1: "ZYX",
  2: "YZX",
  3: "ZXY",
  4: "XZY",
  5: "YXZ",
  6: "XYZ",
};

const vector = ([first = NONE, second = NONE, third = NONE]: readonly number[]): Vector3 =>
  new Vector3(first, second, third);

const floats = (
  object: Instance,
  names: readonly string[],
  fallback: readonly number[],
): readonly number[] => Option.getOrElse(floatsOf({ instance: object, names }), () => fallback);

const quaternionOf = (object: Instance): Quaternion => {
  const [real = UNIT, first = NONE, second = NONE, third = NONE] = floats(object, ["quat"], []);
  return new Quaternion(first, second, third, real).normalize();
};

const axisAngleOf = (object: Instance): Quaternion => {
  const axis = vector(floats(object, ["rotAxis"], UP)).normalize();
  const [angle = NONE] = floats(object, ["rotAngle"], []);
  return new Quaternion().setFromAxisAngle(axis, angle);
};

const rotationOf = (object: Instance): Quaternion => {
  const mode = Option.getOrElse(
    intOf({ instance: object, names: ["rotmode"] }),
    () => XYZ_EULER_MODE,
  );
  if (mode === QUATERNION_MODE) {
    return quaternionOf(object);
  }
  if (mode === AXIS_ANGLE_MODE) {
    return axisAngleOf(object);
  }
  const [first = NONE, second = NONE, third = NONE] = floats(object, ["rot"], ORIGIN);
  const order = EULER_ORDERS[mode] ?? "ZYX";
  return new Quaternion().setFromEuler(new Euler(first, second, third, order));
};

const localOf = (object: Instance): Matrix4 => {
  const position = vector(floats(object, ["loc"], ORIGIN)).add(
    vector(floats(object, ["dloc"], ORIGIN)),
  );
  const scale = vector(floats(object, ["size", "scale"], IDENTITY)).multiply(
    vector(floats(object, ["dscale"], IDENTITY)),
  );
  return new Matrix4().compose(position, rotationOf(object), scale);
};

const worldOf = (object: Instance, depth: number): Matrix4 => {
  const local = localOf(object);
  if (depth >= MAX_DEPTH) {
    return local;
  }
  return pipe(
    follow({ instance: object, names: ["parent"] }),
    Option.flatMap((block) => instanceOf({ file: object.file, block })),
    Option.map((parent) => {
      const identity = new Matrix4().toArray();
      const inverse = new Matrix4().fromArray(floats(object, ["parentinv"], identity));
      return worldOf(parent, depth + NEXT)
        .multiply(inverse)
        .multiply(local);
    }),
    Option.getOrElse(() => local),
  );
};

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

const cornersOf = (mesh: MeshData, face: number): readonly number[] => {
  const start = mesh.offsets[face] ?? NONE;
  const end = mesh.offsets[face + NEXT] ?? NONE;
  return Array.makeBy(Math.max(end - start, NONE), (index) => mesh.corners[start + index] ?? -NEXT);
};

const trianglesOf = (mesh: MeshData, face: number): readonly number[] => {
  const corners = cornersOf(mesh, face);
  const vertices = mesh.positions.length / XYZ;
  const valid = pipe(
    corners,
    Array.every((corner) => corner >= NONE && corner < vertices),
  );
  return pipe(
    Array.head(corners),
    Option.filter(() => valid && corners.length >= TRIANGLE),
    Option.map((first) =>
      pipe(
        Array.range(NEXT, corners.length - TRIANGLE + NEXT),
        Array.flatMap((index) => [first, corners[index] ?? NONE, corners[index + NEXT] ?? NONE]),
      ),
    ),
    Option.getOrElse((): readonly number[] => []),
  );
};

const groupsOf = (mesh: MeshData): readonly Group[] => {
  const slots = Math.max(mesh.colors.length, NEXT);
  const buckets = Array.makeBy(slots, (): number[] => []);
  for (const [face, material] of mesh.materials.entries()) {
    const slot = Math.min(Math.max(material, NONE), slots - NEXT);
    Option.map(Array.get(buckets, slot), (bucket) => bucket.push(...trianglesOf(mesh, face)));
  }
  return pipe(
    buckets,
    Array.map((indices, slot) => ({
      color: mesh.colors[slot] ?? GRAY,
      indices: Uint32Array.from(indices),
    })),
    Array.filter(({ indices }) => indices.length > NONE),
  );
};

const partOf =
  (withHidden: boolean) =>
  (object: Instance): Option.Option<Part> =>
    Option.gen(function* objectPart() {
      const type = yield* intOf({ instance: object, names: ["type"] });
      if (type !== MESH_TYPE || !(withHidden || isShown(object))) {
        return yield* Option.none();
      }
      const block = yield* follow({ instance: object, names: ["data"] });
      const mesh = yield* readMesh(yield* instanceOf({ file: object.file, block }));
      const groups = groupsOf(mesh);
      if (groups.length === NONE) {
        return yield* Option.none();
      }
      return { positions: transformed(mesh.positions, worldOf(object, NONE).toArray()), groups };
    });

const partsOf = (file: BlendFile, withHidden: boolean): readonly Part[] =>
  pipe(
    file.blocks,
    Array.filter(({ code }) => pipe(code, String.startsWith(OBJECT))),
    Array.map((block) => Option.flatMap(instanceOf({ file, block }), partOf(withHidden))),
    Array.getSomes,
  );

const sceneOf = (file: BlendFile): readonly Part[] =>
  Array.match(partsOf(file, false), {
    onEmpty: () => partsOf(file, true),
    onNonEmpty: (parts) => parts,
  });

export { sceneOf };
export type { Group, Part };
