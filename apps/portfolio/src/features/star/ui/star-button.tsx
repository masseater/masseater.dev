import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/index.ts";
import { useStar } from "#/features/star/api/use-star.ts";
import { starView } from "#/features/star/model/star-state.ts";

import { StarToggle } from "./star-toggle";

export const StarButton = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => {
  const { stars, addStar, removeStar } = useStar(entry);
  const view = starView(stars.data);
  return (
    view.status !== "missing" && (
      <StarToggle addStar={addStar} removeStar={removeStar} view={view} />
    )
  );
};
