import { startSiteConfig } from "@masseater.dev/start-site/vite";
import { Option } from "effect";
import { mergeConfig } from "vite-plus";

import { BASE_PATH } from "./src/shared/config/site-base-path.ts";

export default mergeConfig(
  startSiteConfig({
    assetHeaderArgs: "",
    basePath: BASE_PATH,
    searchIndexOrigin: Option.none(),
  }),
  {
    run: {
      tasks: {
        verify: { command: [], dependsOn: ["build"] },
        "deploy:data": {
          command: "alchemy deploy alchemy.data.ts --stage data --yes",
          cache: false,
        },
      },
    },
  },
);
