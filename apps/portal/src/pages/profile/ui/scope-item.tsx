import { getRouteApi, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { SCOPE_PILL } from "./scope-pill";

const route = getRouteApi("/profile");

export const ScopeItem = ({ name }: Readonly<{ name: string }>): ReactNode => {
  const search = route.useSearch();
  const next = useMemo(() => ({ ...search, scope: name }), [search, name]);
  return (
    <li>
      <Link
        aria-current={search.scope === name && "page"}
        className={SCOPE_PILL}
        search={next}
        to="/profile"
      >
        {name}
      </Link>
    </li>
  );
};
