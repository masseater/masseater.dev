import type { Plugin } from "vite-plus";

import { danceShaders } from "./dance-shaders.ts";
import { splitPad } from "./split-pad.ts";
import { techniqueCatalog } from "./technique-catalog.ts";

const standalonePages = (): readonly Plugin[] => [
  techniqueCatalog(),
  danceShaders(),
  ...splitPad(),
];

export { standalonePages };
