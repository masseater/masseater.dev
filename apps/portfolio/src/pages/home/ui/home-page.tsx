import type { ReactNode } from "react";

import { AboutSection } from "./about-section";
import { HeroSection } from "./hero-section";

const HomePage = (): ReactNode => (
  <main data-snap-pages>
    <HeroSection />
    <AboutSection />
  </main>
);

export { HomePage };
