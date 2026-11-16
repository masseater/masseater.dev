import type { ReactNode } from "react";

import { PreparationBar } from "#/features/prepare-engine/index.ts";

import { DirectionBar } from "./direction-bar.tsx";
import { Workspace } from "./workspace.tsx";

export const TranslatorCard = (): ReactNode => (
  <section className="bg-card overflow-hidden rounded-2xl border shadow-sm">
    <DirectionBar />
    <PreparationBar />
    <Workspace />
  </section>
);
