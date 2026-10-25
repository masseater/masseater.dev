import type { ReactNode } from "react";

import { ABOUT_ID, ABOUT_TITLE } from "#/pages/home/model/about";
import { site } from "#/shared/config";

const AboutIntro = (): ReactNode => (
  <header className="flex flex-col gap-4">
    <h2 className="font-display text-5xl font-light sm:text-7xl" id={`${ABOUT_ID}-title`}>
      {ABOUT_TITLE}
    </h2>
    <p className="text-foreground/70">{site.description}</p>
  </header>
);

export { AboutIntro };
