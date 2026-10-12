import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { site } from "#/shared/config";

import { CategoryNav } from "./category-nav";

const SiteHeader = (): ReactNode => (
  <header className="vt-site-header mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 pt-16 pb-6">
    <Link className="font-display text-5xl font-light sm:text-6xl" to="/">
      <span className="vt-site-name inline-block">{site.name}</span>
    </Link>
    <CategoryNav />
  </header>
);

export { SiteHeader };
