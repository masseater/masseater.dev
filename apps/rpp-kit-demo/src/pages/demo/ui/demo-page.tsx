import type { ReactNode } from "react";

import { Playground } from "#/features/playground";

import { Arrangement } from "./arrangement";
import { Hero } from "./hero";
import { SongCredit } from "./song-credit";

export const DemoPage = (): ReactNode => (
  <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6">
    <Hero />
    <Arrangement />
    <SongCredit />
    <Playground />
  </main>
);
