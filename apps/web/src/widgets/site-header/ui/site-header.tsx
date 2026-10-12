import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { site } from "#/shared/config";

import { CategoryNav } from "./category-nav";

const SiteHeader = (): ReactNode => (
  <header className="border-border border-b">
    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4">
      <Link className="font-display text-xl font-bold tracking-wide" to="/">
        {site.name}
      </Link>
      <CategoryNav />
    </div>
  </header>
);

export { SiteHeader };
