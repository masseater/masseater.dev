import { Array as Arr } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Target } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

import { splitPadFiles } from "./split-pad/assets.ts";
import type { StaticFile } from "./split-pad/assets.ts";

const three = new URL("../", import.meta.resolve("three")).href;

const threeFiles: readonly StaticFile[] = [
  [three, "build/three.module.js", "three/build"],
  [three, "build/three.core.js", "three/build"],
  [three, "examples/jsm/controls/OrbitControls.js", "three/examples/jsm/controls"],
  [three, "examples/jsm/renderers/CSS2DRenderer.js", "three/examples/jsm/renderers"],
  [three, "examples/jsm/loaders/GLTFLoader.js", "three/examples/jsm/loaders"],
  [three, "examples/jsm/utils/BufferGeometryUtils.js", "three/examples/jsm/utils"],
  [three, "examples/jsm/utils/SkeletonUtils.js", "three/examples/jsm/utils"],
  [three, "examples/jsm/webxr/XRHandMeshModel.js", "three/examples/jsm/webxr"],
];

const copy = ([root, file, dest]: StaticFile): Target => ({
  src: decodeURIComponent(new URL(file, root).pathname),
  dest,
  rename: { stripBase: true },
});

const vendorAssets = (): readonly Plugin[] =>
  viteStaticCopy({ targets: Arr.map([...threeFiles, ...splitPadFiles], copy) });

export { vendorAssets };
