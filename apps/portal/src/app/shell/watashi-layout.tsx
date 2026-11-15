import type { ReactNode } from "react";

import { SubNav } from "#/shared/ui";
import type { SubNavEntry } from "#/shared/ui";

const ITEMS: readonly SubNavEntry[] = [
  { label: "年表", to: "/" },
  { label: "記録", to: "/records" },
  { label: "作業メモ", to: "/memos" },
  { label: "プロフィール", to: "/profile" },
  { label: "会話", to: "/conversations" },
];

const LABEL = "Watashi";

export const WatashiLayout = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="flex flex-col gap-10">
    <SubNav items={ITEMS} label={LABEL} />
    {children}
  </div>
);
