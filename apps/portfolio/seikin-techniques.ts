import type { Plugin } from "vite-plus";

import { danceShaders } from "./dance-shaders.ts";
import { techniqueCatalog } from "./technique-catalog.ts";

const seikinTechniques = (): readonly Plugin[] => [techniqueCatalog(), danceShaders()];

export { seikinTechniques };
