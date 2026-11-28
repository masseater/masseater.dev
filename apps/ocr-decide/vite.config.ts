import { effectUiSiteConfig } from "@masseater.dev/start-site/vite";
import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { mergeConfig } from "vite-plus";

import { BASE_PATH } from "./src/shared/config/base-path.ts";

export default mergeConfig(
  effectUiSiteConfig({
    locked: LOCKED.input,
    assetHeaderArgs: "--client-compute",
    basePath: BASE_PATH,
    entry: "/src/app/entry.server.ts",
  }),
  { run: { tasks: { verify: { command: [], dependsOn: ["build"] } } } },
);
