import type { ReactNode } from "react";

import { Intro } from "./intro";
import { Results } from "./results";
import { Usage } from "./usage";

const WhyPage = (): ReactNode => (
  <main className="vt-match mx-auto flex max-w-2xl flex-col gap-14 px-4 py-12 md:px-8">
    <Intro />
    <Results />
    <Usage />
  </main>
);

export { WhyPage };
