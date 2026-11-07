import { Select } from "radix-ui";
import type { ReactNode } from "react";

import { ScopeOptions } from "./scope-options.tsx";

const ScopeMenu = (): ReactNode => (
  <Select.Portal>
    <Select.Content
      position="popper"
      sideOffset={4}
      className="bg-popover text-popover-foreground z-50 max-h-96 min-w-56 overflow-hidden rounded-md border shadow-md"
    >
      <ScopeOptions />
    </Select.Content>
  </Select.Portal>
);

export { ScopeMenu };
