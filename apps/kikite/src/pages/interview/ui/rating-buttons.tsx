import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import type { Rating } from "#/pages/interview/model/review-hooks";

import { RatingButton } from "./rating-button.tsx";

const RatingButtons = ({ id, rating }: Readonly<{ id: number; rating: Rating }>): ReactNode => (
  <span
    className={cn(
      "absolute top-2 right-0 flex gap-0.5 transition-opacity",
      rating === "unrated" &&
        "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100",
    )}
  >
    <RatingButton id={id} current={rating} value="good" />
    <RatingButton id={id} current={rating} value="off" />
  </span>
);

export { RatingButtons };
