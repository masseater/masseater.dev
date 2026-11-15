import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Array, Effect, FileSystem, HashMap, Option, Path, Result, Schema, pipe } from "effect";
import { Base64 } from "effect/encoding";

import { glbOf } from "./blend-glb.ts";
import type { Part } from "./blend-scene.ts";
import { texturesOf } from "./blend-textures.ts";

const FIRST = 0;
const SHADE = 0.8;
const RELATIVE_KEY = 1;
const WINDOWS_KEY = 2;
const MISSING_KEY = 3;
const JSON_LENGTH_AT = 12;
const JSON_START = 20;
const LITTLE = true;
const TRIANGLE = [FIRST, RELATIVE_KEY, WINDOWS_KEY];
const CORNERS = 9;
const UVS = 6;

const RED_PIXEL = Result.getOrThrow(
  Base64.decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC",
  ),
);

const TextureRef = Schema.Struct({ index: Schema.Int });

const Pbr = Schema.Struct({ baseColorTexture: Schema.optional(TextureRef) });

const MaterialJson = Schema.Struct({ pbrMetallicRoughness: Pbr });

const GltfJson = Schema.fromJsonString(
  Schema.Struct({ images: Schema.Array(Schema.Unknown), materials: Schema.Array(MaterialJson) }),
);

const decodeGltf = Schema.decodeUnknownEffect(GltfJson);

const jsonOf = (glb: Uint8Array): string => {
  const length = new DataView(glb.buffer, glb.byteOffset).getUint32(JSON_LENGTH_AT, LITTLE);
  return new TextDecoder().decode(glb.subarray(JSON_START, JSON_START + length));
};

const textured = (key: number, filepath: string): Part["groups"][number] => ({
  surface: {
    color: [SHADE, SHADE, SHADE],
    image: Option.some({ key, packed: Option.none(), filepath }),
  },
  indices: Uint32Array.from(TRIANGLE),
});

const part: Part = {
  positions: new Float32Array(CORNERS),
  uvs: Option.some(new Float32Array(UVS)),
  groups: [
    textured(RELATIVE_KEY, "//textures/red.png"),
    textured(WINDOWS_KEY, String.raw`C:\Users\someone\Desktop\red.png`),
    textured(MISSING_KEY, "//missing.png"),
  ],
};

const blendBesideTexture = Effect.gen(function* blendBesideTexture() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const folder = yield* fileSystem.makeTempDirectoryScoped();
  yield* fileSystem.makeDirectory(path.join(folder, "textures"));
  yield* fileSystem.writeFile(path.join(folder, "textures", "red.png"), RED_PIXEL);
  return path.join(folder, "model.blend");
});

layer(NodeServices.layer)("texturesOf", (it) => {
  it.effect("finds textures next to the .blend and puts them into the glTF", () =>
    Effect.gen(function* test() {
      const blend = yield* blendBesideTexture;
      const pngs = yield* texturesOf(blend, [part]);
      const glb = yield* glbOf([part], pngs);
      const gltf = yield* decodeGltf(jsonOf(glb));
      expect(new Set(HashMap.keys(pngs))).toStrictEqual(new Set([RELATIVE_KEY, WINDOWS_KEY]));
      expect(gltf.images).toHaveLength(WINDOWS_KEY);
      const textures = pipe(
        gltf.materials,
        Array.map(({ pbrMetallicRoughness }) =>
          Option.map(
            Option.fromNullishOr(pbrMetallicRoughness.baseColorTexture),
            ({ index }) => index,
          ),
        ),
      );
      expect(textures).toStrictEqual([
        Option.some(FIRST),
        Option.some(RELATIVE_KEY),
        Option.none(),
      ]);
    }),
  );
});
