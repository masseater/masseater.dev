import type { ReactNode } from "react";

import { useQueryText } from "#/pages/home/model";

import { AssetBrowser } from "./asset-browser.tsx";
import { SearchResults } from "./search-results.tsx";

const Assets = (): ReactNode => {
  if (useQueryText() === "") {
    return <AssetBrowser />;
  }
  return <SearchResults />;
};

export { Assets };
