import type { ReactNode } from "react";

import { SectionButtons, Transport } from "#/features/playback/index.ts";

import { Board } from "./board.tsx";

export const Arrangement = (): ReactNode => (
  <section className="flex flex-col gap-3">
    <Transport />
    <SectionButtons />
    <Board />
  </section>
);
