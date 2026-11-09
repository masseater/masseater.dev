import type { ComponentProps } from "react";

import type { Button } from "#/shared/ui/button";

const variantOf = (selected: boolean): ComponentProps<typeof Button>["variant"] => {
  if (selected) {
    return "default";
  }
  return "outline";
};

export { variantOf };
