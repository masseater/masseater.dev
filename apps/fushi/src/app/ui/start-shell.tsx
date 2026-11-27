import { Option } from "effect";
import type { ReactNode } from "react";

import type { Library } from "#/entities/library/index.ts";
import { StylesPage } from "#/pages/styles/index.ts";

import { TopBar } from "./top-bar.tsx";

export const StartShell = ({
  library,
  baselines,
}: Readonly<{ library: Library; baselines: readonly string[] }>): ReactNode => (
  <div className="min-h-dvh">
    <header className="bg-background sticky top-0 z-10 border-b">
      <TopBar current={Option.none()} />
    </header>
    <main className="px-4 pt-5 pb-16">
      <StylesPage library={library} baselines={baselines} />
    </main>
  </div>
);
