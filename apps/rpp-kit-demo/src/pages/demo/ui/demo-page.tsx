import type { ReactNode } from "react";

import { Playground } from "#/features/playground/index.ts";

import { Arrangement } from "./arrangement.tsx";
import { Hero } from "./hero.tsx";
import { SongCredit } from "./song-credit.tsx";

export const DemoPage = (): ReactNode => (
  <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6">
    <Hero />
    <Arrangement />
    <SongCredit />
    <Playground />
  </main>
);
