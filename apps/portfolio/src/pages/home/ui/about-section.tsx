import type { ReactNode } from "react";

import { ABOUT_ID } from "#/pages/home/model/about.ts";

import { AboutIntro } from "./about-intro";
import { AboutPreferences } from "./about-preferences";

export const AboutSection = (): ReactNode => (
  <section
    aria-labelledby={`${ABOUT_ID}-title`}
    className="bg-background grid min-h-dvh snap-start place-items-center px-4 py-16"
    id={ABOUT_ID}
  >
    <div className="flex w-full max-w-2xl flex-col gap-12">
      <AboutIntro />
      <AboutPreferences />
    </div>
  </section>
);
