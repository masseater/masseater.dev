import type { ReactNode } from "react";

import { ManuscriptsPage } from "#/pages/manuscripts/index.ts";
import { SourcesPage } from "#/pages/sources/index.ts";
import { WritePage } from "#/pages/write/index.ts";
import { useScreen } from "#/shared/model/index.ts";

export const Pages = (): ReactNode => {
  const [{ page }] = useScreen();
  if (page === "manuscripts") {
    return <ManuscriptsPage />;
  }
  if (page === "sources") {
    return <SourcesPage />;
  }
  return <WritePage />;
};
