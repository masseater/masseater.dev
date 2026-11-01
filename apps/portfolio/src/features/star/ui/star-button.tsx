import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";
import { useStar } from "#/features/star/api/use-star";
import { starView } from "#/features/star/model/star-state";

import { StarToggle } from "./star-toggle";

const StarButton = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => {
  const { stars, addStar, removeStar } = useStar(entry);
  const view = starView(stars.data);
  return (
    view.status !== "missing" && (
      <StarToggle addStar={addStar} removeStar={removeStar} view={view} />
    )
  );
};

export { StarButton };
