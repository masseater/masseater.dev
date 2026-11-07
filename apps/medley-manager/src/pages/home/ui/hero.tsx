import type { ReactNode } from "react";

import { HeroScreen } from "./hero-screen";
import { SeekBar } from "./seek-bar";

const Hero = (): ReactNode => (
  <section className="bg-screen overflow-hidden rounded-xl border">
    <HeroScreen />
    <SeekBar />
  </section>
);

export { Hero };
