import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { TABS, tabRoute } from "#/app/model/tabs.ts";
import type { Tab } from "#/app/model/tabs.ts";
import { hrefOf } from "#/shared/lib/index.ts";

import { TabLink } from "./tab-link.tsx";

export const StyleTabs = ({
  current: style,
  tab,
}: Readonly<{ current: string; tab: Tab }>): ReactNode => (
  <nav className="flex h-10 gap-6 px-4">
    {pipe(
      TABS,
      Arr.map(([id, label]) => (
        <TabLink key={id} href={hrefOf(tabRoute(id)(style))} active={id === tab}>
          {label}
        </TabLink>
      )),
    )}
  </nav>
);
