import { getRouteApi, Link } from "@tanstack/react-router";
import { Struct } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { SCOPE_PILL } from "./scope-pill";

const route = getRouteApi("/profile");

const ALL = "すべて";

const SCOPE = ["scope"] as const;

export const AllScopesItem = (): ReactNode => {
  const search = route.useSearch();
  const next = useMemo(() => Struct.omit(search, SCOPE), [search]);
  return (
    <li>
      <Link
        aria-current={!("scope" in search) && "page"}
        className={SCOPE_PILL}
        search={next}
        to="/profile"
      >
        {ALL}
      </Link>
    </li>
  );
};
