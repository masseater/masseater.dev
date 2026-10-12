import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { site } from "#/shared/config";

import { CategoryNav } from "./category-nav";

const SiteHeader = (): ReactNode => (
  <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-6">
    <Link className="font-display text-3xl font-light" to="/">
      {site.name}
    </Link>
    <CategoryNav />
  </header>
);

export { SiteHeader };
