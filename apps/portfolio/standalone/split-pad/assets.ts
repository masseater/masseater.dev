const three = new URL("../", import.meta.resolve("three")).href;
const d3Polygon = new URL("../", import.meta.resolve("d3-polygon")).href;
const d3Array = new URL("../", import.meta.resolve("d3-array")).href;
const internmap = new URL("../", import.meta.resolve("internmap")).href;
const handProfiles = new URL("./", import.meta.resolve("@webxr-input-profiles/assets/package.json"))
  .href;

const splitPadFiles = [
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

export { splitPadFiles };
