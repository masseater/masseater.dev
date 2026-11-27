import type { ReactNode } from "react";

import type { Library, Style } from "#/entities/library/index.ts";
import type { Route } from "#/shared/lib/index.ts";

import { SideNav } from "./side-nav.tsx";
import { StylePage } from "./style-page.tsx";

export const StyleBody = ({
  library,
  current: style,
  route,
  baselines,
}: Readonly<{
  library: Library;
  current: Style;
  route: Route;
  baselines: readonly string[];
}>): ReactNode => (
  <div className="flex px-4">
    <nav className="sticky top-22 w-56 shrink-0 self-start border-r py-4 pr-3">
      <SideNav library={library} current={style} route={route} />
    </nav>
    <main className="min-w-0 flex-1 px-8 pt-5 pb-16">
      <StylePage library={library} current={style} route={route} baselines={baselines} />
    </main>
  </div>
);
