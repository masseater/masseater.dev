import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { paragraphKey } from "#/pages/about/model/content";
import type { AboutSection } from "#/pages/about/model/content";

import { AboutParagraph } from "./about-paragraph";

const AboutSectionView = ({ section }: Readonly<{ section: AboutSection }>): ReactNode => (
  <section className="flex flex-col gap-2">
    <h2 className="text-lg font-bold">{section.title}</h2>
    {pipe(
      section.paragraphs,
      Arr.map((segments) => <AboutParagraph key={paragraphKey(segments)} segments={segments} />),
    )}
  </section>
);

export { AboutSectionView };
