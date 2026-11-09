import type { ReactNode } from "react";

import { CopyButton } from "./copy-button.tsx";
import { FormChoiceGroup } from "./form-choice-group.tsx";

const TargetActions = (): ReactNode => (
  <div className="flex min-h-14 items-center gap-2 px-3 pb-2">
    <FormChoiceGroup />
    <CopyButton />
  </div>
);

export { TargetActions };
