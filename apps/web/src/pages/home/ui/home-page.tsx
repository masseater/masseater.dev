import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryInfos } from "#/entities/entry";
import { site } from "#/shared/config";

import { CategorySection } from "./category-section";

const route = getRouteApi("/");

const HomePage = (): ReactNode => {
  const entries = route.useLoaderData();
  return (
    <div className="flex flex-col gap-12">
      <h1 className="sr-only">{site.name}</h1>
      {categoryInfos.map((info) => (
        <CategorySection entries={entries} info={info} key={info.category} />
      ))}
    </div>
  );
};

export { HomePage };
