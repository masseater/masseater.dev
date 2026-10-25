import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

import { StarToggle } from "./star-toggle";
import { useStar } from "./use-star";

const StarButton = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => {
  const { stars, addStar, removeStar } = useStar(entry);
  return (
    stars.status === "success" &&
    stars.data.status === "found" && (
      <StarToggle
        count={stars.data.count}
        starred={stars.data.starred}
        addStar={addStar}
        removeStar={removeStar}
      />
    )
  );
};

export { StarButton };
