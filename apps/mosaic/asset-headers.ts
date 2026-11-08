import { FILES_DIR } from "@thumb-mosaic/mosaic";
import { Array as Arr, pipe } from "effect";
import { ASSET_CACHE_CONTROL, SECURITY_HEADERS } from "security-headers";
import { headerLines, pageRule } from "security-headers/static";
import type { PageHeaders } from "security-headers/static";

import { BASE_PATH } from "./base-path.ts";

const assetHeaders = ({
  documentHeaders,
  pages,
}: Readonly<{
  documentHeaders: Readonly<Record<string, string>>;
  pages: readonly PageHeaders[];
}>): string =>
  pipe(
    [
      "/*",
      ...headerLines(SECURITY_HEADERS),
      ...headerLines(documentHeaders),
      ...pipe(pages, Arr.flatMap(pageRule)),
      `${BASE_PATH}/assets/*`,
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      `${BASE_PATH}/${FILES_DIR}/:slug/:version/*`,
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      "",
    ],
    Arr.join("\n"),
  );

const ASSET_HEADERS = assetHeaders({ documentHeaders: {}, pages: [] });

export { ASSET_HEADERS, assetHeaders };
