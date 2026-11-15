import { Array, Option, pipe } from "effect";
import { Box3, Matrix4, Vector3 } from "three";

import { beveled } from "./blend-bevel.ts";
import type { Bevel } from "./blend-bevel.ts";
import { mirrored, repeated } from "./blend-copies.ts";
import { meshFrom, shapeOf } from "./blend-geometry.ts";
import type { Shape } from "./blend-geometry.ts";
import type { MeshData } from "./blend-mesh.ts";
import { solidified } from "./blend-solidify.ts";
import { embedded, floatsOf, follow, instanceOf, intOf, listOf } from "./blend-structs.ts";
import type { Instance } from "./blend-structs.ts";
import { subdivided } from "./blend-subsurf.ts";
import { worldMatrix } from "./blend-transform.ts";

type Modifier = (shape: Shape) => Shape;

const NONE = 0;
const BIT = 2;
const RENDER = 2;
const SUBSURF = 1;
const MIRROR = 5;
const ARRAY = 12;
const MULTIRES = 29;
const SOLIDIFY = 33;
const BEVEL = 24;
const SUBSURF_CREASE = 16;
const MULTIRES_CREASE = 4;
const AFFECT_EDGES = 1;
const LIMIT_ANGLE = 8;
const LIMIT_WEIGHT = 16;
const SEXTANTS = 6;
const DEFAULT_BEVEL_ANGLE = Math.PI / SEXTANTS;
const SIMPLE = 1;
const PRESERVE_CORNERS = 1;
const MAX_LEVELS = 2;
const AXIS_X = 8;
const AXIS_BITS: readonly number[] = [AXIS_X, AXIS_X * BIT, AXIS_X * BIT * BIT];
const FLIP_U = 2;
const FLIP_V = 4;
const CONSTANT = 1;
const RELATIVE = 2;
const OBJECT_OFFSET = 4;
const FIT_LENGTH = 1;
const RIM = 1;
const FLIP = 32;
const NO_SHELL = 64;
const DEFAULT_THICKNESS = 0.01;
const DEFAULT_FACTOR = -1;
const EPSILON = 1e-6;
const ZEROS: readonly number[] = [NONE, NONE, NONE];

const hasBit = (value: number, bit: number): boolean => Math.floor(value / bit) % BIT !== NONE;

const int = (data: Instance, name: string): number =>
  Option.getOrElse(intOf({ instance: data, names: [name] }), () => NONE);

const floats = (data: Instance, name: string, fallback: readonly number[]): readonly number[] =>
  Option.getOrElse(floatsOf({ instance: data, names: [name] }), () => fallback);

const float = (data: Instance, name: string, fallback: number): number =>
  Option.getOrElse(Array.head(floats(data, name, [fallback])), () => fallback);

const frameOf = (object: Instance, data: Instance, name: string): Option.Option<Matrix4> =>
  pipe(
    follow({ instance: data, names: [name] }),
    Option.flatMap((block) => instanceOf({ file: data.file, block })),
    Option.map((other) => worldMatrix(object).invert().multiply(worldMatrix(other))),
  );

const mirrorOf = (object: Instance, data: Instance): Modifier => {
  const flag = int(data, "flag");
  const flagged = pipe(
    Array.makeBy(AXIS_BITS.length, (axis) => axis),
    Array.filter((axis) => hasBit(flag, AXIS_BITS[axis] ?? NONE)),
  );
  const axes = Array.match(flagged, {
    onEmpty: () => [int(data, "axis")],
    onNonEmpty: (all) => all,
  });
  const mirror = {
    axes,
    frame: Option.getOrElse(frameOf(object, data, "mirror_ob"), () => new Matrix4()).toArray(),
    flipU: hasBit(flag, FLIP_U),
    flipV: hasBit(flag, FLIP_V),
    uvOffset: floats(data, "uv_offset", ZEROS),
    uvShift: floats(data, "uv_offset_copy", ZEROS),
  };
  return mirrored(mirror);
};

const sizeOf = (shape: Shape): Vector3 => {
  const vectors = pipe(
    shape.points,
    Array.map((point) => new Vector3(...point)),
  );
  return new Box3().setFromPoints(vectors).getSize(new Vector3());
};

const offsetOf = (object: Instance, data: Instance, shape: Shape): Matrix4 => {
  const type = int(data, "offset_type");
  const translation = new Vector3();
  if (hasBit(type, CONSTANT)) {
    translation.add(new Vector3(...floats(data, "offset", ZEROS)));
  }
  if (hasBit(type, RELATIVE)) {
    translation.add(new Vector3(...floats(data, "scale", ZEROS)).multiply(sizeOf(shape)));
  }
  const relative = pipe(
    frameOf(object, data, "offset_ob"),
    Option.filter(() => hasBit(type, OBJECT_OFFSET)),
    Option.getOrElse(() => new Matrix4()),
  );
  return new Matrix4().makeTranslation(translation).multiply(relative);
};

const countOf = (data: Instance, step: number): number => {
  if (int(data, "fit_type") !== FIT_LENGTH) {
    return int(data, "count");
  }
  if (step <= EPSILON) {
    return SIMPLE;
  }
  return Math.floor((float(data, "length", NONE) + EPSILON) / step) + SIMPLE;
};

const arrayOf =
  (object: Instance, data: Instance): Modifier =>
  (shape) => {
    const offset = offsetOf(object, data, shape);
    const step = new Vector3().setFromMatrixPosition(offset).length();
    const uvOffset = floats(data, "uv_offset", ZEROS);
    return repeated({ count: countOf(data, step), offset: offset.toArray(), uvOffset })(shape);
  };

const solidifyOf = (data: Instance): Modifier => {
  const flag = int(data, "flag");
  const solidify = {
    thickness: float(data, "offset", DEFAULT_THICKNESS),
    factor: float(data, "offset_fac", DEFAULT_FACTOR),
    rim: hasBit(flag, RIM),
    shell: !hasBit(flag, NO_SHELL),
    flip: hasBit(flag, FLIP),
    shellMaterial: int(data, "mat_ofs"),
    rimMaterial: int(data, "mat_ofs_rim"),
  };
  return solidified(solidify);
};

const subdivisionOf = (
  data: Instance,
  names: Readonly<{ levels: string; crease: number; simple: (value: number) => boolean }>,
): Modifier => {
  const levels = Math.min(Math.max(int(data, names.levels), NONE), MAX_LEVELS);
  const rules = {
    smooth: !names.simple(int(data, "subdivType") + int(data, "simple")),
    corners: int(data, "boundary_smooth") === PRESERVE_CORNERS,
    creases: hasBit(int(data, "flags"), names.crease),
  };
  return subdivided({ levels, rules });
};

const limitOf = (data: Instance): Bevel["limit"] => {
  const flags = int(data, "lim_flags");
  if (int(data, "affect_type") !== AFFECT_EDGES) {
    return "none";
  }
  if (hasBit(flags, LIMIT_ANGLE)) {
    return "angle";
  }
  if (hasBit(flags, LIMIT_WEIGHT)) {
    return "weight";
  }
  return "all";
};

const bevelOf = (data: Instance): Modifier =>
  beveled({ limit: limitOf(data), angle: float(data, "bevel_angle", DEFAULT_BEVEL_ANGLE) });

const builders: Readonly<Record<number, (object: Instance, data: Instance) => Modifier>> = {
  [SUBSURF]: (_object, data) =>
    subdivisionOf(data, {
      levels: "renderLevels",
      crease: SUBSURF_CREASE,
      simple: (value) => value === SIMPLE,
    }),
  [MULTIRES]: (_object, data) =>
    subdivisionOf(data, {
      levels: "renderlvl",
      crease: MULTIRES_CREASE,
      simple: (value) => value !== NONE,
    }),
  [MIRROR]: mirrorOf,
  [ARRAY]: arrayOf,
  [SOLIDIFY]: (_object, data) => solidifyOf(data),
  [BEVEL]: (_object, data) => bevelOf(data),
};

const modifierOf =
  (object: Instance) =>
  (data: Instance): Option.Option<Modifier> =>
    Option.gen(function* modifier() {
      const base = yield* embedded({
        lookup: { instance: data, names: ["modifier"] },
        structName: "ModifierData",
      });
      const enabled = hasBit(int(base, "mode"), RENDER);
      const build = yield* Option.fromNullishOr(builders[int(base, "type")]);
      return yield* Option.liftPredicate(build(object, data), () => enabled);
    });

export const modifiedMesh = ({
  object,
  mesh,
}: Readonly<{ object: Instance; mesh: MeshData }>): MeshData =>
  pipe(
    listOf({ instance: object, names: ["modifiers"] }),
    Array.map(modifierOf(object)),
    Array.getSomes,
    Array.match({
      onEmpty: () => mesh,
      onNonEmpty: (modifiers) => {
        let shape = shapeOf(mesh);
        for (const modifier of modifiers) {
          shape = modifier(shape);
        }
        return meshFrom({ shape, base: mesh });
      },
    }),
  );
