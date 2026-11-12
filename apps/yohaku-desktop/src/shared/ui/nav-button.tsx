import { cn } from "@masseater.dev/ui/cn";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useScreen } from "#/shared/model";
import type { Page } from "#/shared/model";

const NavButton = ({ label, page }: Readonly<{ label: string; page: Page }>): ReactNode => {
  const [screen, setScreen] = useScreen();
  const current = screen.page === page;
  const onClick = useCallback(() => {
    setScreen({ ...screen, page });
  }, [screen, setScreen, page]);
  return (
    <button
      aria-current={current && "page"}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground",
        current && "font-bold text-foreground",
      )}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export { NavButton };
