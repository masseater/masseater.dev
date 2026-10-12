import { Outlet, useChildMatches } from "@tanstack/react-router";
import type { ReactNode } from "react";

const SiteMain = (): ReactNode => {
  const pathname = useChildMatches({
    select: (matches) => matches.map((match) => match.pathname).join(","),
  });
  return (
    <main className="vt-match mx-auto w-full max-w-3xl flex-1 px-4 py-12" key={pathname}>
      <Outlet />
    </main>
  );
};

export { SiteMain };
