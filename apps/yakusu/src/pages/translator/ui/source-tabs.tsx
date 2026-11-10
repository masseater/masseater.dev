import { Array, pipe } from "effect";
import type { Option } from "effect";
import type { ReactNode } from "react";

import type { LanguageCode } from "#/pages/translator/model/languages.ts";
import { useRecentSources } from "#/pages/translator/model/selection.ts";

import { DetectTab } from "./detect-tab.tsx";
import { PickerToggle } from "./picker-toggle.tsx";
import { SourceTab } from "./source-tab.tsx";

const SourceTabs = ({
  detected,
}: Readonly<{ detected: Option.Option<LanguageCode> }>): ReactNode => (
  <div className="flex min-w-0 flex-1 items-center overflow-hidden pl-2">
    <DetectTab detected={detected} />
    {pipe(
      useRecentSources(),
      Array.map((code) => <SourceTab key={code} code={code} />),
    )}
    <PickerToggle side="source" />
  </div>
);

export { SourceTabs };
