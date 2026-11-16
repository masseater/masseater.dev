import type { ReactNode } from "react";

import { AboutSection } from "./about-section.tsx";
import { HeroSection } from "./hero-section.tsx";

export const HomePage = (): ReactNode => (
  <main data-snap-pages>
    <HeroSection />
    <AboutSection />
  </main>
);
