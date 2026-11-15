import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Card, CardHeader, SearchField } from "#/shared/ui";

import { SlidesResults } from "./slides-results";

const route = getRouteApi("/slides");

const TEXT = { title: "スライド", search: "スライドを探す" } as const;

const ACTION = "/slides";

export const SlidesPage = (): ReactNode => {
  const search = route.useSearch();
  return (
    <Card>
      <CardHeader title={TEXT.title}>
        <SearchField action={ACTION} label={TEXT.search} value={search.keyword ?? ""} />
      </CardHeader>
      <SlidesResults search={search} />
    </Card>
  );
};
