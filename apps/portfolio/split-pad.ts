import { Array as Arr, pipe } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

const DEST = "split-pad/three";

const threeEntry = import.meta.resolve("three");

const threeFiles = [
  { url: threeEntry, dir: "build" },
  { url: new URL("three.core.js", threeEntry).href, dir: "build" },
  {
    url: import.meta.resolve("three/examples/jsm/controls/OrbitControls.js"),
    dir: "examples/jsm/controls",
  },
  {
    url: import.meta.resolve("three/examples/jsm/renderers/CSS2DRenderer.js"),
    dir: "examples/jsm/renderers",
  },
  {
    url: import.meta.resolve("three/examples/jsm/loaders/GLTFLoader.js"),
    dir: "examples/jsm/loaders",
  },
  {
    url: import.meta.resolve("three/examples/jsm/utils/BufferGeometryUtils.js"),
    dir: "examples/jsm/utils",
  },
  {
    url: import.meta.resolve("three/examples/jsm/utils/SkeletonUtils.js"),
    dir: "examples/jsm/utils",
  },
] as const;

const splitPad = (): readonly Plugin[] =>
  viteStaticCopy({
    targets: pipe(
      threeFiles,
      Arr.map(({ url, dir }) => ({
        src: decodeURIComponent(new URL(url).pathname),
        dest: `${DEST}/${dir}`,
        rename: { stripBase: true },
      })),
    ),
  });

export { splitPad };
