import { FILES_DIR } from "@thumb-mosaic/mosaic";
import { headersFileFor } from "security-headers/static";

import { BASE_PATH } from "#base-path";

export const assetHeaders = headersFileFor([
  `${BASE_PATH}/assets/*`,
  `${BASE_PATH}/${FILES_DIR}/:slug/:version/*`,
]);

export const ASSET_HEADERS = assetHeaders({ documentHeaders: {}, pages: [] });
