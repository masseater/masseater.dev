import { Array as Arr, pipe } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Target } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

const three = new URL("../", import.meta.resolve("three")).href;
const d3Polygon = new URL("../", import.meta.resolve("d3-polygon")).href;
const d3Array = new URL("../", import.meta.resolve("d3-array")).href;
const internmap = new URL("../", import.meta.resolve("internmap")).href;
const handProfiles = new URL("./", import.meta.resolve("@webxr-input-profiles/assets/package.json"))
  .href;

const files = [
  [three, "examples/jsm/controls/OrbitControls.js", "three/examples/jsm/controls"],
  [three, "examples/jsm/renderers/CSS2DRenderer.js", "three/examples/jsm/renderers"],
  [three, "examples/jsm/loaders/GLTFLoader.js", "three/examples/jsm/loaders"],
  [three, "examples/jsm/utils/BufferGeometryUtils.js", "three/examples/jsm/utils"],
  [three, "examples/jsm/utils/SkeletonUtils.js", "three/examples/jsm/utils"],
  [three, "examples/jsm/webxr/XRHandMeshModel.js", "three/examples/jsm/webxr"],
  [d3Polygon, "src/*.js", "split-pad/d3-polygon/src"],
  [d3Array, "src/*.js", "split-pad/d3-array/src"],
  [d3Array, "src/threshold/*.js", "split-pad/d3-array/src/threshold"],
  [internmap, "src/index.js", "split-pad/internmap/src"],
  [
    handProfiles,
    "dist/profiles/generic-hand/right.glb",
    "split-pad/webxr-input-profiles/dist/profiles/generic-hand",
  ],
] as const;

const splitPadAssets = (
  copy: (entry: readonly [root: string, file: string, dest: string]) => Target,
): readonly Plugin[] =>
  viteStaticCopy({
    targets: pipe(
      files,
      Arr.map((entry) => copy(entry)),
    ),
  });

export { splitPadAssets };
