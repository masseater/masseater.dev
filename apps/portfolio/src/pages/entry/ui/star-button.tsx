import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";
import { starQueries } from "#/pages/entry/api/star-queries";

import { StarToggle } from "./star-toggle";

const StarButton = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => {
  const queryClient = useQueryClient();
  const route = starQueries.api.stars({ category: entry.category })({ slug: entry.slug });
  const stars = useQuery(route.get.queryOptions());
  const onSuccess = (data: NonNullable<typeof stars.data>): void => {
    queryClient.setQueryData(route.get.queryKey(), data);
  };
  const add = useMutation(route.put.mutationOptions({ onSuccess }));
  const remove = useMutation(route.delete.mutationOptions({ onSuccess }));
  return (
    stars.status === "success" &&
    stars.data.status === "found" && (
      <StarToggle
        count={stars.data.count}
        pending={add.status === "pending" || remove.status === "pending"}
        starred={stars.data.starred}
        addStar={add.mutate}
        removeStar={remove.mutate}
      />
    )
  );
};

export { StarButton };
