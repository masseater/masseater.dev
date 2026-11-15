import type { ReactNode } from "react";

import type { ProfileSectionValue } from "#/entities/watashi";
import { jstMinute } from "#/shared/model";

import { ScopeNav } from "./scope-nav";
import { SectionToc } from "./section-toc";

const TEXT = { built: "最終ビルド" } as const;

export const ProfileAside = ({
  builtAt,
  scopes,
  sections,
}: Readonly<{
  builtAt: string;
  scopes: readonly string[];
  sections: readonly ProfileSectionValue[];
}>): ReactNode => (
  <aside className="bg-card flex flex-col gap-5 rounded-xl border p-4 lg:sticky lg:top-20">
    <ScopeNav scopes={scopes} />
    <SectionToc sections={sections} />
    <p className="text-muted-foreground text-xs tabular-nums">{`${TEXT.built} ${jstMinute(builtAt)}`}</p>
  </aside>
);
