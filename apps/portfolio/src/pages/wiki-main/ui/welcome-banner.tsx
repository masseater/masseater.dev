import type { ReactNode } from "react";

import { WELCOME } from "#/pages/wiki-main/model/copy";

const WelcomeBanner = (): ReactNode => (
  <section className="bg-wiki-surface border-wiki-divider border px-4 py-6 text-center">
    <h1 className="font-serif text-3xl">{WELCOME}</h1>
  </section>
);

export { WelcomeBanner };
