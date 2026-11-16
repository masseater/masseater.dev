import type { ComponentProps } from "react";

import type { Button } from "#/shared/ui/button.tsx";

export const variantOf = (selected: boolean): ComponentProps<typeof Button>["variant"] => {
  if (selected) {
    return "default";
  }
  return "outline";
};
