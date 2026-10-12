import type { ReactNode } from "react";

import { CategoryNav } from "./category-nav";
import { SiteLogo } from "./site-logo";

const SiteHeader = (): ReactNode => (
  <header className="vt-site-header mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-6">
    <SiteLogo />
    <CategoryNav />
  </header>
);

export { SiteHeader };
