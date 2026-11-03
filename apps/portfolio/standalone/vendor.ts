import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Target } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

const three = new URL("../", import.meta.resolve("three")).href;
const d3Polygon = new URL("../", import.meta.resolve("d3-polygon")).href;
const d3Array = new URL("../", import.meta.resolve("d3-array")).href;
const internmap = new URL("../", import.meta.resolve("internmap")).href;
const handProfiles = new URL("./", import.meta.resolve("@webxr-input-profiles/assets/package.json"))
  .href;

const copy = (root: string, file: string, dest: string): Target => ({
  src: decodeURIComponent(new URL(file, root).pathname),
  dest,
  rename: { stripBase: true },
});

const vendorAssets = (): readonly Plugin[] =>
  viteStaticCopy({
    targets: [
      copy(three, "build/three.module.js", "three/build"),
      copy(three, "build/three.core.js", "three/build"),
      copy(three, "examples/jsm/controls/OrbitControls.js", "three/examples/jsm/controls"),
      copy(three, "examples/jsm/renderers/CSS2DRenderer.js", "three/examples/jsm/renderers"),
      copy(three, "examples/jsm/loaders/GLTFLoader.js", "three/examples/jsm/loaders"),
      copy(three, "examples/jsm/utils/BufferGeometryUtils.js", "three/examples/jsm/utils"),
      copy(three, "examples/jsm/utils/SkeletonUtils.js", "three/examples/jsm/utils"),
      copy(three, "examples/jsm/webxr/XRHandMeshModel.js", "three/examples/jsm/webxr"),
      copy(d3Polygon, "src/*.js", "split-pad/d3-polygon/src"),
      copy(d3Array, "src/*.js", "split-pad/d3-array/src"),
      copy(d3Array, "src/threshold/*.js", "split-pad/d3-array/src/threshold"),
      copy(internmap, "src/index.js", "split-pad/internmap/src"),
      copy(
        handProfiles,
        "dist/profiles/generic-hand/right.glb",
        "split-pad/webxr-input-profiles/dist/profiles/generic-hand",
      ),
    ],
  });

export { vendorAssets };
