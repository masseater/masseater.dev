import type { ReactNode } from "react";

import { HeroScreen } from "./hero-screen.tsx";
import { SeekBar } from "./seek-bar.tsx";

export const Hero = (): ReactNode => (
  <section className="bg-screen overflow-hidden rounded-xl border">
    <HeroScreen />
    <SeekBar />
  </section>
);
