import type { ReactNode } from "react";

import type { Rating } from "#/pages/interview/model/review-hooks";

import { RatingButton } from "./rating-button.tsx";

const RatingButtons = ({ id, rating }: Readonly<{ id: number; rating: Rating }>): ReactNode => (
  <span className="flex shrink-0 gap-0.5">
    <RatingButton id={id} current={rating} value="good" />
    <RatingButton id={id} current={rating} value="off" />
  </span>
);

export { RatingButtons };
