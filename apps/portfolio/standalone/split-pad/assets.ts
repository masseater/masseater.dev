import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Target } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

const three = new URL("../", import.meta.resolve("three")).href;
const d3Polygon = new URL("../", import.meta.resolve("d3-polygon")).href;
const handProfiles = new URL("./", import.meta.resolve("@webxr-input-profiles/assets/package.json"))
  .href;

const copy = (root: string, file: string, dest: string): Target => ({
  src: decodeURIComponent(new URL(file, root).pathname),
  dest,
  rename: { stripBase: true },
});

const splitPadAssets = (): readonly Plugin[] =>
  viteStaticCopy({
    targets: [
      copy(three, "build/three.module.js", "split-pad/three/build"),
      copy(three, "build/three.core.js", "split-pad/three/build"),
      copy(
        three,
        "examples/jsm/controls/OrbitControls.js",
        "split-pad/three/examples/jsm/controls",
      ),
      copy(
        three,
        "examples/jsm/renderers/CSS2DRenderer.js",
        "split-pad/three/examples/jsm/renderers",
      ),
      copy(three, "examples/jsm/loaders/GLTFLoader.js", "split-pad/three/examples/jsm/loaders"),
      copy(
        three,
        "examples/jsm/utils/BufferGeometryUtils.js",
        "split-pad/three/examples/jsm/utils",
      ),
      copy(three, "examples/jsm/utils/SkeletonUtils.js", "split-pad/three/examples/jsm/utils"),
      copy(three, "examples/jsm/webxr/XRHandMeshModel.js", "split-pad/three/examples/jsm/webxr"),
      copy(d3Polygon, "src/*.js", "split-pad/d3-polygon/src"),
      copy(
        handProfiles,
        "dist/profiles/generic-hand/right.glb",
        "split-pad/webxr-input-profiles/dist/profiles/generic-hand",
      ),
    ],
  });

export { splitPadAssets };
