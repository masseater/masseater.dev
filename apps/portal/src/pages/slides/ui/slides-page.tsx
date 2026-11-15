import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SearchField } from "#/shared/ui";

import { SlidesResults } from "./slides-results";

const route = getRouteApi("/slides");

const SEARCH = "スライドを探す";

const ACTION = "/slides";

export const SlidesPage = (): ReactNode => {
  const search = route.useSearch();
  return (
    <div className="flex flex-col gap-8">
      <SearchField action={ACTION} label={SEARCH} value={search.keyword ?? ""} />
      <SlidesResults search={search} />
    </div>
  );
};
