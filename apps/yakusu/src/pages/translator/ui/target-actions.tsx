import type { ReactNode } from "react";

import { FormChoiceGroup } from "#/features/choose-form/index.ts";
import { CopyButton } from "#/features/copy-translation/index.ts";

export const TargetActions = (): ReactNode => (
  <div className="flex min-h-14 items-center gap-2 px-3 pb-2">
    <FormChoiceGroup />
    <CopyButton />
  </div>
);
