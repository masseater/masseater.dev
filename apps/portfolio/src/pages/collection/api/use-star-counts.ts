import { useQuery } from "@tanstack/react-query";
import { Option } from "effect";
import type { Record } from "effect";

import { categoryMeta } from "#/entities/entry";
import type { Category } from "#/entities/entry";
import { starQueries } from "#/features/star";

const useStarCounts = (
  category: Category,
): Option.Option<Record.ReadonlyRecord<string, number>> => {
  const stars = useQuery({
    ...starQueries.api.stars({ category }).get.queryOptions(),
    enabled: categoryMeta[category].reactions,
  });
  if (stars.status !== "success" || stars.data.status === "missing") {
    return Option.none();
  }
  return Option.some(stars.data.counts);
};

export { useStarCounts };
