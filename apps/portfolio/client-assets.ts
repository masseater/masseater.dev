import type { Plugin } from "vite-plus";

import { assetHeaders } from "./asset-headers.ts";
import { ogImage } from "./og-image.ts";
import { standalonePages } from "./standalone-pages.ts";
import { splitPadAssets } from "./standalone/split-pad/assets.ts";
import { copy, vendorAssets } from "./standalone/vendor.ts";

const clientAssets = (beaconToken: unknown): readonly Plugin[] => [
  assetHeaders(),
  ogImage(),
  ...standalonePages(beaconToken),
  ...vendorAssets(),
  ...splitPadAssets(copy),
];

export { clientAssets };
