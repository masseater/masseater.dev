import { startSiteConfig } from "@masseater.dev/start-site/vite";
import { Option } from "effect";

import { BASE_PATH } from "./base-path.ts";

export default startSiteConfig({
  assetHeaderArgs: "",
  basePath: BASE_PATH,
  searchIndexOrigin: Option.none(),
});
