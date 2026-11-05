import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CreditsFrame } from "./credits-frame";
import { CreditsList } from "./credits-list";

const route = getRouteApi("/$slug_/credits");

const CreditsPage = (): ReactNode => {
  const tiles = route.useLoaderData();
  return (
    <CreditsFrame>
      <CreditsList tiles={tiles} />
    </CreditsFrame>
  );
};

export { CreditsPage };
