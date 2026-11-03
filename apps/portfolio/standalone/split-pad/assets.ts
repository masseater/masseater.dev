const d3Polygon = new URL("../", import.meta.resolve("d3-polygon")).href;
const d3Array = new URL("../", import.meta.resolve("d3-array")).href;
const internmap = new URL("../", import.meta.resolve("internmap")).href;
const handProfiles = new URL("./", import.meta.resolve("@webxr-input-profiles/assets/package.json"))
  .href;

type StaticFile = readonly [root: string, file: string, dest: string];

const splitPadFiles: readonly StaticFile[] = [
  [d3Polygon, "src/*.js", "split-pad/d3-polygon/src"],
  [d3Array, "src/*.js", "split-pad/d3-array/src"],
  [d3Array, "src/threshold/*.js", "split-pad/d3-array/src/threshold"],
  [internmap, "src/index.js", "split-pad/internmap/src"],
  [
    handProfiles,
    "dist/profiles/generic-hand/right.glb",
    "split-pad/webxr-input-profiles/dist/profiles/generic-hand",
  ],
];

export type { StaticFile };
export { splitPadFiles };
