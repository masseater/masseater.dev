import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

import { IndexBox } from "./index-box";
import { RecentBox } from "./recent-box";
import { WelcomeBanner } from "./welcome-banner";

const MainView = ({ entries }: Readonly<{ entries: readonly Entry[] }>): ReactNode => (
  <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
    <WelcomeBanner count={entries.length} />
    <div className="grid items-start gap-6 md:grid-cols-2">
      <RecentBox entries={entries} />
      <IndexBox entries={entries} />
    </div>
  </main>
);

export { MainView };
