import { Array as Arr, String as Str, pipe } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Target } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

const DEST = "split-pad";
const FILE_NAME = /\/[^/]+$/u;

const packages = [
  {
    dir: "three",
    root: new URL("../", import.meta.resolve("three")),
    files: [
      "build/three.module.js",
      "build/three.core.js",
      "examples/jsm/controls/OrbitControls.js",
      "examples/jsm/renderers/CSS2DRenderer.js",
      "examples/jsm/loaders/GLTFLoader.js",
      "examples/jsm/utils/BufferGeometryUtils.js",
      "examples/jsm/utils/SkeletonUtils.js",
      "examples/jsm/webxr/XRHandMeshModel.js",
    ],
  },
  {
    dir: "webxr-input-profiles",
    root: new URL("./", import.meta.resolve("@webxr-input-profiles/assets/package.json")),
    files: ["dist/profiles/generic-hand/right.glb"],
  },
] as const;

const splitPad = (): readonly Plugin[] =>
  viteStaticCopy({
    targets: pipe(
      packages,
      Arr.flatMap(({ dir, root, files }) =>
        pipe(
          files,
          Arr.map((file): Target => ({
            src: decodeURIComponent(new URL(file, root).pathname),
            dest: `${DEST}/${dir}/${Str.replace(FILE_NAME, "")(file)}`,
            rename: { stripBase: true },
          })),
        ),
      ),
    ),
  });

export { splitPad };
