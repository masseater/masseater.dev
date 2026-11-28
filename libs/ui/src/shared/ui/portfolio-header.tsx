import type { ReactNode } from "react";

import { PortfolioLogo } from "./portfolio-logo.tsx";
import { PortfolioSectionLinks } from "./portfolio-section-links.tsx";
import { PortfolioSocialLinks } from "./portfolio-social-links.tsx";

export const PortfolioHeader = (): ReactNode => (
  <header className="flex flex-col items-center gap-6 px-6 pt-8">
    <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <PortfolioLogo />
      <PortfolioSocialLinks />
    </div>
    <PortfolioSectionLinks />
  </header>
);
