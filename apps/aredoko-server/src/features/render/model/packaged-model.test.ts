import { expect, layer } from "@effect/vitest";
import { Array, Effect, FileSystem, Path, pipe } from "effect";

import type { LooseFile } from "#shared/unitypackage";

import { readModel, readModelPart } from "./read-model.ts";
import { putRender } from "./render-jobs.ts";
import {
  FIRST,
  MAIN_FILE,
  MATERIAL,
  RED_PIXEL,
  TEXTURE,
  addPackage,
  dataInTemporaryFolder,
  encoded,
  stagingExists,
} from "./render.test.support.ts";

const MODEL_GUID = "0123456789abcdef0123456789abcdef";
const MATERIAL_GUID = "11111111111111111111111111111111";
const TEXTURE_GUID = "22222222222222222222222222222222";
const UNRELATED_GUID = "33333333333333333333333333333333";
const BLEND_GUID = "44444444444444444444444444444444";
const GLB_MAGIC = "glTF";
const MAGIC_BYTES = 4;

const packagedObj = encoded(`mtllib ${MATERIAL}\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n`);

const packagedFiles: readonly LooseFile[] = [
  { guid: MODEL_GUID, pathname: "Assets/Wall/Wall.obj", data: packagedObj },
  {
    guid: MATERIAL_GUID,
    pathname: `Assets/Wall/${MATERIAL}`,
    data: encoded(`map_Kd ${TEXTURE}\n`),
  },
  { guid: TEXTURE_GUID, pathname: `Assets/Textures/${TEXTURE}`, data: RED_PIXEL },
  { guid: UNRELATED_GUID, pathname: "Assets/Textures/floor.png", data: RED_PIXEL },
];

const cubeBlend = Effect.gen(function* cubeBlend() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* fileSystem.readFile(
    path.join(import.meta.dirname, "../../../shared/blend/fixtures/cube.blend"),
  );
});

layer(dataInTemporaryFolder, { excludeTestServices: true })("packaged models", (it) => {
  it.effect("unitypackage の中のモデルを取り出し、名前で参照されたファイルだけを添える", () =>
    Effect.gen(function* readsPackagedModel() {
      const [assetId = FIRST] = yield* addPackage(packagedFiles);
      const { name, size, files } = yield* readModel(assetId);
      const { data: model } = yield* readModelPart({ assetId, file: MAIN_FILE, offset: FIRST });
      const { data: texture } = yield* readModelPart({ assetId, file: TEXTURE, offset: FIRST });
      const names = pipe(
        files,
        Array.map((companion) => companion.name),
      );
      expect({ name, size, names: new Set(names), texture }).toStrictEqual({
        name: "model.obj",
        size: packagedObj.length,
        names: new Set([MATERIAL, TEXTURE]),
        texture: RED_PIXEL,
      });
      expect(Buffer.from(model).equals(Buffer.from(packagedObj))).toBe(true);
    }),
  );

  it.effect("描画を受け取ったら、取り出したファイルを消す", () =>
    Effect.gen(function* discardsStaging() {
      const [assetId = FIRST] = yield* addPackage(packagedFiles);
      yield* readModel(assetId);
      const staged = yield* stagingExists;
      yield* putRender({ assetId, pngs: [RED_PIXEL] });
      const after = yield* stagingExists;
      expect({ staged, after }).toStrictEqual({ staged: true, after: false });
    }),
  );

  it.effect("unitypackage の中の .blend は glTF に変えて渡す", () =>
    Effect.gen(function* readsPackagedBlend() {
      const blend = yield* cubeBlend;
      const [assetId = FIRST] = yield* addPackage([
        { guid: BLEND_GUID, pathname: "Assets/Cube.blend", data: blend },
      ]);
      const { name, files } = yield* readModel(assetId);
      const { data } = yield* readModelPart({ assetId, file: MAIN_FILE, offset: FIRST });
      const magic = new TextDecoder().decode(data.subarray(FIRST, MAGIC_BYTES));
      expect({ name, files, magic }).toStrictEqual({
        name: "model.glb",
        files: [],
        magic: GLB_MAGIC,
      });
    }),
  );
});
