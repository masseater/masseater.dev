import type { ReactNode } from "react";

import { countLine, WELCOME } from "#/pages/wiki-main/model/copy";

const WelcomeBanner = ({ count }: Readonly<{ count: number }>): ReactNode => (
  <section className="bg-wiki-surface border-wiki-divider border px-4 py-6 text-center">
    <h1 className="font-serif text-3xl">{WELCOME}</h1>
    <p className="text-wiki-subtle mt-2 text-sm">{countLine(count)}</p>
  </section>
);

export { WelcomeBanner };
