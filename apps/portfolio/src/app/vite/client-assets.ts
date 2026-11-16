import type { Plugin } from "vite-plus";

import { ogImage } from "#/app/vite/og/og-image.ts";

import { assetHeaders } from "./asset-headers.ts";

export const clientAssets = (): readonly Plugin[] => [assetHeaders(), ogImage()];
