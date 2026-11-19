import type { ImgHTMLAttributes } from "react";

export type ImagePriority = Readonly<
  Pick<ImgHTMLAttributes<HTMLImageElement>, "fetchPriority" | "loading">
>;

const LEAD_INDEX = 0;

const LEAD: ImagePriority = { fetchPriority: "high", loading: "eager" };

const BELOW_FOLD: ImagePriority = { loading: "lazy" };

export const imagePriority = (index: number): ImagePriority => {
  if (index === LEAD_INDEX) {
    return LEAD;
  }
  return BELOW_FOLD;
};
