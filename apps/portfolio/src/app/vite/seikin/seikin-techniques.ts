import type { Plugin } from "vite-plus";

import { danceShaders } from "./dance-shaders.ts";
import { techniqueCatalog } from "./technique-catalog.ts";

export const seikinTechniques = (): readonly Plugin[] => [techniqueCatalog(), danceShaders()];
