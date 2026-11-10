import { Array as Arr } from "effect";

import type { Detection } from "./detect.ts";

type Outcome = Detection["status"] | "unreadable";

const outcomeOf = ({ status, unreadable = [] }: Detection): Outcome => {
  if (status === "clean" && Arr.isReadonlyArrayNonEmpty(unreadable)) {
    return "unreadable";
  }
  return status;
};

export { outcomeOf };
export type { Outcome };
