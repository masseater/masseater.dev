import { getRouteApi } from "@tanstack/react-router";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { VIDEO_KINDS } from "#/entities/catalog";

import { AllKindsLink } from "./all-kinds-link";
import { KindFilterLink } from "./kind-filter-link";

const route = getRouteApi("/videos/");

const KindFilter = (): ReactNode => {
  const { kind: current } = route.useSearch();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="種類">
      <AllKindsLink
        selected={
          !pipe(
            VIDEO_KINDS,
            Array.some((kind) => kind === current),
          )
        }
      />
      {pipe(
        VIDEO_KINDS,
        Array.map((kind) => <KindFilterLink key={kind} kind={kind} selected={kind === current} />),
      )}
    </nav>
  );
};

export { KindFilter };
