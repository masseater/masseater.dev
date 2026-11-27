import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { CATEGORIES, LABELS } from "#/shared/config/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";
import type { Route } from "#/shared/lib/index.ts";
import { NavHeading, NavLink } from "#/shared/ui/index.ts";

export const HabitsNav = ({
  current: style,
  route,
}: Readonly<{ current: string; route: Route }>): ReactNode => (
  <>
    <NavLink href={hrefOf({ page: "overview", style })} active={route.page === "overview"}>
      {LABELS.overview}
    </NavLink>
    <NavHeading>{LABELS.categories}</NavHeading>
    {pipe(
      CATEGORIES,
      Arr.map((category) => (
        <NavLink
          key={category.id}
          href={hrefOf({ page: "category", style, category: category.id })}
          active={route.page === "category" && route.category === category.id}
        >
          {category.name}
        </NavLink>
      )),
    )}
  </>
);
