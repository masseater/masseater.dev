import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useRecentTargets } from "#/entities/language";
import type { LanguageCode } from "#/entities/language";

import { PickerToggle } from "./picker-toggle.tsx";
import { TargetTab } from "./target-tab.tsx";

const TargetTabs = ({ target }: Readonly<{ target: LanguageCode }>): ReactNode => (
  <div className="flex min-w-0 flex-1 items-center overflow-hidden pl-2">
    {pipe(
      useRecentTargets(),
      Array.map((code) => <TargetTab key={code} active={code === target} code={code} />),
    )}
    <PickerToggle side="target" />
  </div>
);

export { TargetTabs };
