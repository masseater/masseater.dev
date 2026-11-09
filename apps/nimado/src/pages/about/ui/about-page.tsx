import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { SECTIONS } from "#/pages/about/model/content";

import { AboutHeader } from "./about-header";
import { AboutSectionView } from "./about-section";

const AboutPage = (): ReactNode => (
  <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 text-sm leading-relaxed">
    <AboutHeader />
    {pipe(
      SECTIONS,
      Arr.map((section) => <AboutSectionView key={section.title} section={section} />),
    )}
  </main>
);

export { AboutPage };
