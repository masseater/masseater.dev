import type { Plugin } from "vite-plus";

import { ogImage } from "./og-image.ts";
import { standalonePages } from "./standalone-pages.ts";
import { splitPadAssets } from "./standalone/split-pad/assets.ts";

const clientAssets = (beaconToken: unknown): readonly Plugin[] => [
  ogImage(),
  ...standalonePages(beaconToken),
  ...splitPadAssets(),
];

export { clientAssets };
