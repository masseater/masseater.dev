import type { ReactNode } from "react";

import { SITE_DESCRIPTION, SITE_NAME } from "#/shared/config";

const SiteFooter = (): ReactNode => (
  <footer className="mt-16 border-t">
    <p className="text-muted-foreground mx-auto max-w-6xl px-4 py-8 text-sm">
      {`${SITE_NAME} ― ${SITE_DESCRIPTION}`}
    </p>
  </footer>
);

export { SiteFooter };
