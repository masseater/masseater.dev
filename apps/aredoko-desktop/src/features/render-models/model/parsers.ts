import { Array, Effect, Option, String, pipe } from "effect";
import type { LoadingManager, Object3D } from "three";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { TDSLoader } from "three/examples/jsm/loaders/TDSLoader.js";

import type { ModelFile } from "./file-urls.ts";
import { ModelUnreadable } from "./model-unreadable.ts";

interface ModelSource {
  readonly pathname: string;
  readonly model: Uint8Array;
  readonly files: readonly ModelFile[];
}

type Parse = (
  source: ModelSource,
  manager: LoadingManager,
) => Effect.Effect<Object3D, ModelUnreadable>;

const BASE = "./";
const MATERIAL_EXTENSION = ".mtl";

const text = new TextDecoder();

const bufferOf = (bytes: Uint8Array): ArrayBuffer => Uint8Array.from(bytes).buffer;

const isMaterial = ({ name }: ModelFile): boolean =>
  pipe(name, String.toLowerCase, String.endsWith(MATERIAL_EXTENSION));

const objLoader = (files: readonly ModelFile[], manager: LoadingManager): OBJLoader => {
  const loader = new OBJLoader(manager);
  return pipe(
    files,
    Array.findFirst(isMaterial),
    Option.map(({ data }) => {
      const materials = new MTLLoader(manager).parse(text.decode(data), BASE);
      materials.preload();
      return loader.setMaterials(materials);
    }),
    Option.getOrElse(() => loader),
  );
};

const unreadable =
  (pathname: string) =>
  (cause: unknown): ModelUnreadable =>
    ModelUnreadable.make({ pathname, cause });

const attempt = <Value>(
  pathname: string,
  evaluate: () => Value,
): Effect.Effect<Value, ModelUnreadable> =>
  Effect.try({ try: evaluate, catch: unreadable(pathname) });

const parseGltf: Parse = ({ model, pathname }, manager) =>
  Effect.tryPromise({
    try: () => new GLTFLoader(manager).parseAsync(bufferOf(model), BASE),
    catch: unreadable(pathname),
  }).pipe(Effect.map(({ scene }) => scene));

const parseCollada: Parse = ({ model, pathname }, manager) =>
  pipe(
    attempt(pathname, () => new ColladaLoader(manager).parse(text.decode(model), BASE)),
    Effect.flatMap((collada) =>
      pipe(Option.fromNullOr(collada), Effect.fromOption, Effect.mapError(unreadable(pathname))),
    ),
    Effect.map(({ scene }) => scene),
  );

const parseFbx: Parse = ({ model, pathname }, manager) =>
  attempt(pathname, () => new FBXLoader(manager).parse(bufferOf(model), BASE));

const parseObj: Parse = ({ model, files, pathname }, manager) =>
  attempt(pathname, () => objLoader(files, manager).parse(text.decode(model)));

const parseTds: Parse = ({ model, pathname }, manager) =>
  attempt(pathname, () => new TDSLoader(manager).parse(bufferOf(model), BASE));

/** @internal */
const PARSERS: Readonly<Record<string, Parse>> = {
  fbx: parseFbx,
  obj: parseObj,
  glb: parseGltf,
  gltf: parseGltf,
  vrm: parseGltf,
  dae: parseCollada,
  "3ds": parseTds,
};

export { PARSERS, unreadable };
export type { ModelSource, Parse };
