import type { Plugin } from "vite-plus";

import { ogImage } from "./og-image.ts";
import { standalonePages } from "./standalone-pages.ts";
import { vendorAssets } from "./standalone/vendor.ts";

const clientAssets = (beaconToken: unknown): readonly Plugin[] => [
  ogImage(),
  ...standalonePages(beaconToken),
  ...vendorAssets(),
];

export { clientAssets };
