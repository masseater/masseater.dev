import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { categoryInfos, entryQueries } from "#/entities/entry";

import { CategorySection } from "./category-section";
import { Profile } from "./profile";

const HomePage = (): ReactNode => {
  const { data } = useSuspenseQuery(entryQueries.all());
  return (
    <div className="flex flex-col gap-12">
      <Profile />
      {categoryInfos.map((info) => (
        <CategorySection entries={data} info={info} key={info.category} />
      ))}
    </div>
  );
};

export { HomePage };
