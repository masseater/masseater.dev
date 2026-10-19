import { Outlet, useChildMatches } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const SiteMain = (): ReactNode => {
  const pathname = useChildMatches({
    select: (matches) =>
      Arr.join(
        pipe(
          matches,
          Arr.map((match) => match.pathname),
        ),
        ",",
      ),
  });
  return (
    <main className="vt-match mx-auto w-full max-w-5xl flex-1 px-4 py-12" key={pathname}>
      <Outlet />
    </main>
  );
};

export { SiteMain };
