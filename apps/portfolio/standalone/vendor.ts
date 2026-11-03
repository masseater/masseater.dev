import { Array as Arr, pipe } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Target } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

const three = new URL("../", import.meta.resolve("three")).href;

const copy = ([root, file, dest]: readonly [root: string, file: string, dest: string]): Target => ({
  src: decodeURIComponent(new URL(file, root).pathname),
  dest,
  rename: { stripBase: true },
});

const files = [
  [three, "build/three.module.js", "three/build"],
  [three, "build/three.core.js", "three/build"],
] as const;

const vendorAssets = (): readonly Plugin[] =>
  viteStaticCopy({
    targets: pipe(
      files,
      Arr.map((entry) => copy(entry)),
    ),
  });

export { copy, vendorAssets };
