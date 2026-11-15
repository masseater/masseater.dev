import type { ReactNode } from "react";

import { SectionButtons, Transport } from "#/features/playback";

import { Board } from "./board";

export const Arrangement = (): ReactNode => (
  <section className="flex flex-col gap-3">
    <Transport />
    <SectionButtons />
    <Board />
  </section>
);
