import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { ABOUT_BIO, ABOUT_ID, ABOUT_TITLE } from "#/pages/home/model/about";

const AboutIntro = (): ReactNode => (
  <header className="flex flex-col gap-4">
    <h2 className="font-display text-5xl font-light sm:text-7xl" id={`${ABOUT_ID}-title`}>
      {ABOUT_TITLE}
    </h2>
    {pipe(
      ABOUT_BIO,
      Arr.map((line) => (
        <p className="text-foreground/80 leading-relaxed" key={line}>
          {line}
        </p>
      )),
    )}
  </header>
);

export { AboutIntro };
