import type { ReactNode } from "react";

import type { ProfileSectionValue } from "#/entities/watashi/index.ts";

import { CopyButton } from "./copy-button.tsx";
import { LangTabs } from "./lang-tabs.tsx";

export const DocumentBar = ({
  sections,
}: Readonly<{ sections: readonly ProfileSectionValue[] }>): ReactNode => (
  <header className="flex items-end justify-between gap-4 border-b">
    <LangTabs />
    <CopyButton sections={sections} />
  </header>
);
