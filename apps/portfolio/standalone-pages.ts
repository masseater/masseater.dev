import type { Plugin } from "vite-plus";

import { seikinTechniques } from "./seikin-techniques.ts";
import { splitPad } from "./split-pad.ts";

const standalonePages = (): readonly Plugin[] => [...seikinTechniques(), ...splitPad()];

export { standalonePages };
