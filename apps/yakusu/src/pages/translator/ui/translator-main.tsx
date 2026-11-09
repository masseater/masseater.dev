import type { ReactNode } from "react";

import { TranslatorCard } from "./translator-card.tsx";

const TranslatorMain = (): ReactNode => (
  <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
    <TranslatorCard />
  </main>
);

export { TranslatorMain };
