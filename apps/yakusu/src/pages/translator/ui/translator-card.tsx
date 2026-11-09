import type { ReactNode } from "react";

import { DirectionBar } from "./direction-bar.tsx";
import { Workspace } from "./workspace.tsx";

const TranslatorCard = (): ReactNode => (
  <section className="bg-card overflow-hidden rounded-2xl border shadow-sm">
    <DirectionBar />
    <Workspace />
  </section>
);

export { TranslatorCard };
