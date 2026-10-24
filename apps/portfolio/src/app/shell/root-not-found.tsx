import { SiteStage } from "@masseater.dev/ui";
import type { ReactNode } from "react";

import { NotFound } from "#/widgets/not-found";

import { SiteHeader } from "./site-header";

const RootNotFound = (): ReactNode => (
  <SiteStage>
    <SiteHeader />
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <NotFound />
    </main>
  </SiteStage>
);

export { RootNotFound };
