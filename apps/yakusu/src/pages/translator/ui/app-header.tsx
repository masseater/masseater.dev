import { Languages } from "lucide-react";
import type { ReactNode } from "react";

const APP_NAME = "yakusu";

const AppHeader = (): ReactNode => (
  <header className="flex h-16 items-center gap-3 border-b px-6">
    <span className="bg-highlight flex size-9 items-center justify-center rounded-lg text-white">
      <Languages className="size-5" />
    </span>
    <span className="text-xl font-medium tracking-tight">{APP_NAME}</span>
  </header>
);

export { AppHeader };
