import type { ReactNode } from "react";

import { ABOUT_ID, ABOUT_TITLE } from "#/pages/home/model/about";

const DOWN = "↓";

const AboutCue = (): ReactNode => (
  <a
    className="stage-link font-display absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1 px-2 py-3 text-xs tracking-widest"
    href={`#${ABOUT_ID}`}
  >
    {ABOUT_TITLE}
    <span aria-hidden className="animate-bounce">
      {DOWN}
    </span>
  </a>
);

export { AboutCue };
