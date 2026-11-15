import { Array, Option, pipe } from "effect";

import { CORNER_DOMAIN, attribute, floatArray, named } from "./blend-attributes.ts";
import type { Matches } from "./blend-attributes.ts";
import { elementsOf, floatsOf, intOf, textOf } from "./blend-structs.ts";
import type { Instance } from "./blend-structs.ts";

const UV = 2;
const UNIT = 1;
const NONE = 0;
const NEXT = 1;
const FLOAT2_LAYER = 49;
const LEGACY_LAYER = 16;
const FLOAT2_ATTRIBUTE = 6;
const CORNER_ATTRIBUTE = 3;
const MISSING = -1;
const DEFAULT_NAME = "UVMap";
const NAME_FIELDS: readonly string[] = ["default_uv_map_attribute", "active_uv_map_attribute"];

const numberOf = (instance: Instance, names: readonly string[]): number =>
  Option.getOrElse(intOf({ instance, names }), () => MISSING);

const isFloat2 = (instance: Instance): boolean =>
  numberOf(instance, ["type"]) === FLOAT2_LAYER ||
  (numberOf(instance, ["data_type"]) === FLOAT2_ATTRIBUTE &&
    numberOf(instance, ["domain"]) === CORNER_ATTRIBUTE);

const isLegacy = (instance: Instance): boolean => numberOf(instance, ["type"]) === LEGACY_LAYER;

const both =
  (first: Matches, second: Matches): Matches =>
  (instance) =>
    first(instance) && second(instance);

const namesOf = (mesh: Instance): readonly string[] =>
  pipe(
    NAME_FIELDS,
    Array.map((field) => textOf({ instance: mesh, names: [field] })),
    Array.getSomes,
    Array.append(DEFAULT_NAME),
  );

const flipped = (uvs: Float32Array): Float32Array => {
  const result = Float32Array.from(uvs);
  for (const index of Array.makeBy(result.length / UV, (corner) => corner * UV + NEXT)) {
    result[index] = UNIT - (result[index] ?? NONE);
  }
  return result;
};

const float2Of = (mesh: Instance, corners: number, matches: Matches): Option.Option<Float32Array> =>
  Option.flatMap(attribute({ mesh, domain: CORNER_DOMAIN, matches }), (block) =>
    floatArray({ file: mesh.file, block, length: corners * UV }),
  );

const legacyOf = (mesh: Instance, corners: number): Option.Option<Float32Array> =>
  Option.flatMap(attribute({ mesh, domain: CORNER_DOMAIN, matches: isLegacy }), (block) => {
    const loops = elementsOf({ file: mesh.file, block, structName: "MLoopUV" }).slice(
      NONE,
      corners,
    );
    return pipe(
      loops,
      Array.map((loop) => floatsOf({ instance: loop, names: ["uv"] })),
      Option.all,
      Option.filter(() => loops.length === corners),
      Option.map((values) => Float32Array.from(Array.flatten(values))),
    );
  });

export const uvsOf = ({
  mesh,
  corners,
}: Readonly<{ mesh: Instance; corners: number }>): Option.Option<Float32Array> =>
  pipe(
    namesOf(mesh),
    Array.map((name) => both(isFloat2, named(name))),
    Array.append(isFloat2),
    Array.findFirst((matches) => float2Of(mesh, corners, matches)),
    Option.orElse(() => legacyOf(mesh, corners)),
    Option.map(flipped),
  );
