import { Array as Arr } from "effect";

import type { Detection } from "./detect.ts";

export type Outcome = Detection["status"] | "unreadable";

export const outcomeOf = ({ status, unreadable = [] }: Detection): Outcome => {
  if (status === "clean" && Arr.isReadonlyArrayNonEmpty(unreadable)) {
    return "unreadable";
  }
  return status;
};
