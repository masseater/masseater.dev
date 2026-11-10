import type { Option } from "effect";
import type { ReactNode } from "react";

import type { LanguageCode } from "#/pages/translator/model/languages.ts";

import { SourceTabs } from "./source-tabs.tsx";
import { TargetTabs } from "./target-tabs.tsx";

const LanguageBar = ({
  children,
  detected,
  target,
}: Readonly<{
  children: ReactNode;
  detected: Option.Option<LanguageCode>;
  target: LanguageCode;
}>): ReactNode => (
  <div className="flex items-center border-b">
    <SourceTabs detected={detected} />
    {children}
    <TargetTabs target={target} />
  </div>
);

export { LanguageBar };
