import type { Plugin } from "vite-plus";

import { assetHeaders } from "./asset-headers.ts";
import { ogImage } from "./og/og-image.ts";

export const clientAssets = (): readonly Plugin[] => [assetHeaders(), ogImage()];
