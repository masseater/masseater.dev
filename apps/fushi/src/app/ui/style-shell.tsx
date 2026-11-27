import { Option } from "effect";
import type { ReactNode } from "react";

import { tabOf } from "#/app/model/tabs.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import type { Route } from "#/shared/lib/index.ts";

import { StyleBody } from "./style-body.tsx";
import { StyleTabs } from "./style-tabs.tsx";
import { TopBar } from "./top-bar.tsx";

export const StyleShell = ({
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
  <div className="min-h-dvh">
    <header className="bg-background sticky top-0 z-10 border-b">
      <TopBar current={Option.some(style)} />
      <StyleTabs current={style.id} tab={tabOf(route)} />
    </header>
    <StyleBody library={library} current={style} route={route} baselines={baselines} />
  </div>
);
