const three = new URL("../", import.meta.resolve("three")).href;
const d3Polygon = new URL("../", import.meta.resolve("d3-polygon")).href;
const d3Array = new URL("../", import.meta.resolve("d3-array")).href;
const internmap = new URL("../", import.meta.resolve("internmap")).href;
const zenKaku = new URL("./", import.meta.resolve("@fontsource/zen-kaku-gothic-new/package.json"))
  .href;
const delaGothic = new URL("./", import.meta.resolve("@fontsource/dela-gothic-one/package.json"))
  .href;
const plexMono = new URL("./", import.meta.resolve("@fontsource/ibm-plex-mono/package.json")).href;
const handProfiles = new URL("./", import.meta.resolve("@webxr-input-profiles/assets/package.json"))
  .href;

const splitPadFiles = [
  [zenKaku, "{400,500,700}.css", "split-pad/fonts/zen-kaku-gothic-new"],
  [zenKaku, "files/*-{400,500,700}-normal.woff2", "split-pad/fonts/zen-kaku-gothic-new/files"],
  [delaGothic, "400.css", "split-pad/fonts/dela-gothic-one"],
  [delaGothic, "files/*-400-normal.woff2", "split-pad/fonts/dela-gothic-one/files"],
  [plexMono, "{400,500}.css", "split-pad/fonts/ibm-plex-mono"],
  [plexMono, "files/*-{400,500}-normal.woff2", "split-pad/fonts/ibm-plex-mono/files"],
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
