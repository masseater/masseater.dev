import type { ReactNode } from "react";

import { AppHeader } from "./app-header.tsx";
import { Credit } from "./credit.tsx";
import { TranslatorMain } from "./translator-main.tsx";

const TranslatorPage = (): ReactNode => (
  <div className="flex min-h-dvh flex-col">
    <AppHeader />
    <TranslatorMain />
    <Credit />
  </div>
);

export { TranslatorPage };
