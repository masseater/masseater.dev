import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { KeywordForm } from "#/shared/ui/keyword-form";

import { NavLinks } from "./nav-links";
import { SiteLogo } from "./site-logo";

const HeaderBar = (): ReactNode => (
  <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
    <Link to="/" aria-label="トップへ">
      <SiteLogo />
    </Link>
    <NavLinks />
    <div className="w-full sm:ml-auto sm:w-72">
      <KeywordForm action="/search" label="曲・動画・担当者" keyword="" />
    </div>
  </div>
);

export { HeaderBar };
