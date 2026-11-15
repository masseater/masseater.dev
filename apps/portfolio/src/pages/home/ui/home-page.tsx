import type { ReactNode } from "react";

import { AboutSection } from "./about-section";
import { HeroSection } from "./hero-section";

export const HomePage = (): ReactNode => (
  <main data-snap-pages>
    <HeroSection />
    <AboutSection />
  </main>
);
