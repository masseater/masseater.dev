import { Option, pipe } from "effect";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { EulerOrder } from "three";

import { floatsOf, follow, instanceOf, intOf } from "./blend-structs.ts";
import type { Instance } from "./blend-structs.ts";

const QUATERNION_MODE = 0;
const AXIS_ANGLE_MODE = -1;
const XYZ_EULER_MODE = 1;
const NONE = 0;
const NEXT = 1;
const MAX_DEPTH = 64;
const UNIT = 1;
const IDENTITY: readonly number[] = [UNIT, UNIT, UNIT];
const ORIGIN: readonly number[] = [NONE, NONE, NONE];
const UP: readonly number[] = [NONE, UNIT, NONE];

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

export const worldMatrix = (object: Instance): Matrix4 => worldOf(object, NONE);
