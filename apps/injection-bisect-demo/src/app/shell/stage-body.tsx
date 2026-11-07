import { RegistryProvider } from "@effect/atom-react";
import { PortfolioHeader, SiteStage } from "@masseater.dev/web-ui";
import type { ReactNode } from "react";

const StageBody = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <RegistryProvider>
    <SiteStage>
      <PortfolioHeader />
      {children}
    </SiteStage>
  </RegistryProvider>
);

export { StageBody };
