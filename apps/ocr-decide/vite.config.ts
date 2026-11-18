import { startSiteConfig } from "@masseater.dev/start-site/vite";
import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { mergeConfig } from "vite-plus";

import { BASE_PATH } from "./src/shared/config/base-path.ts";
import { SEARCH_INDEX_ORIGIN } from "./src/shared/config/search.ts";

export default mergeConfig(
  startSiteConfig({
    locked: LOCKED.input,
    assetHeaderArgs: "--client-compute",
    basePath: BASE_PATH,
    searchIndexOrigin: SEARCH_INDEX_ORIGIN,
  }),
  { run: { tasks: { verify: { command: [], dependsOn: ["build"] } } } },
);
