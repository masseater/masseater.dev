import type { ReactNode } from "react";

import { PortfolioLogo } from "./portfolio-logo.tsx";
import { PortfolioSectionLinks } from "./portfolio-section-links.tsx";
import { PortfolioSocialLinks } from "./portfolio-social-links.tsx";

const PortfolioHeader = (): ReactNode => (
  <header className="flex flex-col items-center gap-6 px-6 pt-8">
    <div className="flex w-full items-center justify-between gap-4">
      <PortfolioLogo />
      <PortfolioSocialLinks />
    </div>
    <PortfolioSectionLinks />
  </header>
);

export { PortfolioHeader };
