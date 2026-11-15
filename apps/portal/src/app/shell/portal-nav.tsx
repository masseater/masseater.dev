import { useRouterState } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { SECTIONS } from "#/shared/config";

import { PortalNavItem } from "./portal-nav-item";

const LABEL = "セクション";

const PortalNav = (): ReactNode => {
  const matched = useRouterState({
    select: (state) =>
      pipe(
        state.matches,
        Arr.map((match) => match.routeId),
      ),
  });
  return (
    <nav aria-label={LABEL}>
      <ul className="flex justify-end sm:justify-center sm:gap-x-4">
        {pipe(
          SECTIONS,
          Arr.map((section) => (
            <PortalNavItem
              active={Arr.contains(matched, section.routeId)}
              key={section.to}
              label={section.label}
              to={section.to}
            />
          )),
        )}
      </ul>
    </nav>
  );
};

export { PortalNav };
