import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { useScreen } from "#/shared/model";
import type { Page } from "#/shared/model";

interface Destination {
  readonly label: string;
  readonly page: Page;
}

const DESTINATIONS: readonly Destination[] = [
  { label: "本文", page: "write" },
  { label: "原稿", page: "manuscripts" },
  { label: "資料", page: "sources" },
];

const AppHeader = ({ children }: Readonly<{ children?: ReactNode }>): ReactNode => {
  const [screen, setScreen] = useScreen();
  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b px-5">
      {children}
      <div className="grow" />
      <nav aria-label="画面" className="flex gap-1">
        {DESTINATIONS.map(({ label, page }) => (
          <button
            key={page}
            type="button"
            aria-current={screen.page === page ? "page" : undefined}
            onClick={() => setScreen({ ...screen, page })}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground",
              screen.page === page && "font-bold text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
};

export { AppHeader };
