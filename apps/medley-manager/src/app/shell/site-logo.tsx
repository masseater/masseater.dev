import type { ReactNode } from "react";

import { SITE_NAME } from "#/shared/config";

const PLAY_MARK = "▶";

const SiteLogo = (): ReactNode => (
  <span className="flex items-center gap-2">
    <span
      aria-hidden="true"
      className="bg-primary text-primary-foreground flex size-8 -rotate-6 items-center justify-center rounded-lg text-sm"
    >
      {PLAY_MARK}
    </span>
    <span className="font-display text-xl tracking-wide">{SITE_NAME}</span>
  </span>
);

export { SiteLogo };
