import { Array as Arr } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Target } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

type StaticFile = readonly [root: string, file: string, dest: string];

const three = new URL("../", import.meta.resolve("three")).href;

const files: readonly StaticFile[] = [
  [three, "build/three.module.js", "three/build"],
  [three, "build/three.core.js", "three/build"],
];

const copy = ([root, file, dest]: StaticFile): Target => ({
  src: decodeURIComponent(new URL(file, root).pathname),
  dest,
  rename: { stripBase: true },
});

const vendorAssets = (pageFiles: readonly StaticFile[]): readonly Plugin[] =>
  viteStaticCopy({ targets: Arr.map([...files, ...pageFiles], copy) });

export type { StaticFile };
export { vendorAssets };
