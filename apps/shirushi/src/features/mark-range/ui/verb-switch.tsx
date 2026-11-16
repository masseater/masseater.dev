import type { ReactNode } from "react";

import { VerbButton } from "./verb-button.tsx";

export const VerbSwitch = (): ReactNode => (
  <fieldset aria-label="好きか苦手か" className="m-0 flex min-w-0 gap-1 border-0 p-0">
    <VerbButton verb="like" />
    <VerbButton verb="dislike" />
  </fieldset>
);
