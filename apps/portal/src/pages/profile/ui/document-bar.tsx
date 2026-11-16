import type { ReactNode } from "react";

import type { ProfileSectionValue } from "#/entities/watashi";

import { CopyButton } from "./copy-button";
import { LangTabs } from "./lang-tabs";

export const DocumentBar = ({
  sections,
}: Readonly<{ sections: readonly ProfileSectionValue[] }>): ReactNode => (
  <header className="flex items-end justify-between gap-4 border-b">
    <LangTabs />
    <CopyButton sections={sections} />
  </header>
);
