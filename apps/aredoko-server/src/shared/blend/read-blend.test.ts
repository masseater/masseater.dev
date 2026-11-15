import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Array, Effect, Number as Numbers, Option, Path, Schema, pipe } from "effect";
import sharp from "sharp";
import { Box3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { blendModel } from "./blend-model.ts";
import { blendPreview } from "./read-blend.ts";

const THUMBNAIL_SIDE = 128;
const NO_SIZE = [Number.NaN, Number.NaN] as const;
const TRIANGLE = 3;
const NONE = 0;
const UNIT = 1;
const XYZ = 3;
const JSON_LENGTH_AT = 12;
const JSON_START = 20;
const LITTLE = true;
const CUBE = { vertices: 24, triangles: 12, corner: Array.replicate(UNIT, XYZ) };
const SUZANNE = { vertices: 1968, triangles: 968 };

const Primitive = Schema.Struct({
  attributes: Schema.Struct({ POSITION: Schema.Int }),
  indices: Schema.Int,
});

const MeshJson = Schema.Struct({ primitives: Schema.Array(Primitive) });

const AccessorJson = Schema.Struct({ count: Schema.Int });

const GltfJson = Schema.Struct({
  meshes: Schema.Array(MeshJson),
  accessors: Schema.Array(AccessorJson),
});

type Gltf = typeof GltfJson.Type;

const decodeGltf = Schema.decodeUnknownEffect(Schema.fromJsonString(GltfJson));

const fixturePath = Effect.gen(function* fixturePath() {
  const path = yield* Path.Path;
  return path.join(import.meta.dirname, "fixtures", "cube.blend");
});

const sizeOf = Effect.fn("sizeOf")(function* sizeOf(png: Uint8Array) {
  const { width, height } = yield* Effect.promise(() => sharp(png).metadata());
  return [width, height] as const;
});

const sizeOrNone = (
  png: Option.Option<Uint8Array>,
): Effect.Effect<readonly [number | undefined, number | undefined]> =>
  Option.match(png, { onNone: () => Effect.succeed(NO_SIZE), onSome: sizeOf });

const jsonOf = (glb: Uint8Array): string => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const length = view.getUint32(JSON_LENGTH_AT, LITTLE);
  return new TextDecoder().decode(glb.subarray(JSON_START, JSON_START + length));
};

const countOf = (gltf: Gltf, accessor: number): number =>
  Option.getOrElse(
    Option.map(Array.get(gltf.accessors, accessor), ({ count }) => count),
    () => NONE,
  );

const shapesOf = (gltf: Gltf): readonly { vertices: number; triangles: number }[] =>
  pipe(
    gltf.meshes,
    Array.map(({ primitives }) => ({
      vertices: pipe(
        Array.head(primitives),
        Option.map(({ attributes }) => countOf(gltf, attributes.POSITION)),
        Option.getOrElse(() => NONE),
      ),
      triangles: pipe(
        primitives,
        Array.map(({ indices }) => countOf(gltf, indices) / TRIANGLE),
        Numbers.sumAll,
      ),
    })),
  );

const cornerOf = (glb: Uint8Array): Effect.Effect<readonly number[]> =>
  Effect.map(
    Effect.promise(() => new GLTFLoader().parseAsync(Uint8Array.from(glb).buffer, "./")),
    ({ scene }) =>
      pipe(
        Array.head(scene.children),
        Option.map((cube) => new Box3().setFromObject(cube).max.toArray()),
        Option.getOrElse((): readonly number[] => []),
      ),
  );

layer(NodeServices.layer)("blendPreview", (it) => {
  it.effect("reads the thumbnail Blender saved in a compressed .blend", () =>
    Effect.gen(function* test() {
      const fixture = yield* fixturePath;
      const png = yield* blendPreview(fixture);
      const size = yield* sizeOrNone(png);
      expect(size).toStrictEqual([THUMBNAIL_SIDE, THUMBNAIL_SIDE]);
    }),
  );

  it.effect("turns every mesh of a .blend into glTF", () =>
    Effect.gen(function* test() {
      const fixture = yield* fixturePath;
      const glb = yield* blendModel(fixture);
      const gltf = yield* decodeGltf(jsonOf(glb));
      const corner = yield* cornerOf(glb);
      expect(shapesOf(gltf)).toStrictEqual([
        { vertices: CUBE.vertices, triangles: CUBE.triangles },
        SUZANNE,
      ]);
      expect(corner).toStrictEqual(CUBE.corner);
    }),
  );
});
