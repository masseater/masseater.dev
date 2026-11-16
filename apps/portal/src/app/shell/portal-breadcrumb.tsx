import { useRouterState } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { CrumbItem } from "./crumb-item.tsx";
import { crumbsOf } from "./crumbs.ts";

const LABEL = "現在地";

const FIRST = 0;

const LAST_OFFSET = 1;

export const PortalBreadcrumb = (): ReactNode => {
  const crumbs = crumbsOf(useRouterState({ select: (state) => state.location.pathname }));
  return (
    <nav aria-label={LABEL} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {pipe(
          crumbs,
          Arr.map((crumb, index) => (
            <CrumbItem
              crumb={crumb}
              first={index === FIRST}
              key={crumb.label}
              last={index === crumbs.length - LAST_OFFSET}
            />
          )),
        )}
      </ol>
    </nav>
  );
};
