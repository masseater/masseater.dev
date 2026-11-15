import type { ReactNode } from "react";

import { useQueryText } from "#/entities/asset";

import { AssetBrowser } from "./asset-browser.tsx";
import { SearchResults } from "./search-results.tsx";

export const Assets = (): ReactNode => {
  if (useQueryText() === "") {
    return <AssetBrowser />;
  }
  return <SearchResults />;
};
