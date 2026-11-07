import { startSiteConfig } from "@masseater.dev/start-site/vite";

import { BASE_PATH } from "./base-path.ts";
import { SEARCH_INDEX_ORIGIN } from "./src/shared/config/search.ts";

export default startSiteConfig({
  assetHeaderArgs: "",
  basePath: BASE_PATH,
  searchIndexOrigin: SEARCH_INDEX_ORIGIN,
});
