import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { Effect } from "effect";
import type { LoadingManager, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { ModelUnreadable } from "./model-unreadable.ts";

interface GltfSource {
  readonly buffer: ArrayBuffer;
  readonly pathname: string;
  readonly manager: LoadingManager;
}

const BASE = "./";
const VRM_KEY = "vrm";
const VRM_ZERO = "0";

const unreadable =
  (pathname: string) =>
  (cause: unknown): ModelUnreadable =>
    ModelUnreadable.make({ pathname, cause });

const vrmOf = (
  userData: Readonly<Record<string, unknown>>,
  pathname: string,
): Effect.Effect<VRM, ModelUnreadable> => {
  const vrm: unknown = userData[VRM_KEY];
  if (vrm instanceof VRM) {
    return Effect.succeed(vrm);
  }
  return Effect.fail(unreadable(pathname)(vrm));
};

const gltfScene = ({
  buffer,
  pathname,
  manager,
}: GltfSource): Effect.Effect<Object3D, ModelUnreadable> =>
  Effect.tryPromise({
    try: () => new GLTFLoader(manager).parseAsync(buffer, BASE),
    catch: unreadable(pathname),
  }).pipe(Effect.map(({ scene }) => scene));

const vrmScene = ({
  buffer,
  pathname,
  manager,
}: GltfSource): Effect.Effect<Object3D, ModelUnreadable> =>
  Effect.tryPromise({
    try: () =>
      new GLTFLoader(manager)
        .register((parser) => new VRMLoaderPlugin(parser))
        .parseAsync(buffer, BASE),
    catch: unreadable(pathname),
  }).pipe(
    Effect.flatMap(({ userData }) => vrmOf(userData, pathname)),
    Effect.map((vrm) => {
      if (vrm.meta.metaVersion === VRM_ZERO) {
        VRMUtils.rotateVRM0(vrm);
      }
      return vrm.scene;
    }),
  );

export { gltfScene, unreadable, vrmScene };
export type { GltfSource };
