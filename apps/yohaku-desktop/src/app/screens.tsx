import type { ReactNode } from "react";

import { ManuscriptsPage } from "#/pages/manuscripts";
import { SourcesPage } from "#/pages/sources";
import { WritePage } from "#/pages/write";
import { useScreen } from "#/shared/model";

const Screens = (): ReactNode => {
  const [{ page }] = useScreen();
  if (page === "manuscripts") {
    return <ManuscriptsPage />;
  }
  if (page === "sources") {
    return <SourcesPage />;
  }
  return <WritePage />;
};

export { Screens };
