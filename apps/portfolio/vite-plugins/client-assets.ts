import type { Plugin } from "vite-plus";

import { splitPadFiles } from "#standalone/split-pad/assets.ts";
import { vendorAssets } from "#standalone/vendor.ts";

import { assetHeaders } from "./asset-headers.ts";
import { ogImage } from "./og/og-image.ts";
import { standalonePages } from "./standalone-pages.ts";

const clientAssets = (beaconToken: unknown): readonly Plugin[] => [
  assetHeaders(),
  ogImage(),
  ...standalonePages(beaconToken),
  ...vendorAssets(splitPadFiles),
];

export { clientAssets };
