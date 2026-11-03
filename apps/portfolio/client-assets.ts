import type { Plugin } from "vite-plus";

import { ogImage } from "./og-image.ts";
import { splitPad } from "./split-pad.ts";

const clientAssets = (): readonly Plugin[] => [ogImage(), ...splitPad()];

export { clientAssets };
