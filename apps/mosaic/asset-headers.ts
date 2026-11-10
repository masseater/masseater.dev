import { FILES_DIR } from "@thumb-mosaic/mosaic";
import { headersFileFor } from "security-headers/static";

import { BASE_PATH } from "./base-path.ts";

const assetHeaders = headersFileFor([
  `${BASE_PATH}/assets/*`,
  `${BASE_PATH}/${FILES_DIR}/:slug/:version/*`,
]);

const ASSET_HEADERS = assetHeaders({ documentHeaders: {}, pages: [] });

export { ASSET_HEADERS, assetHeaders };
