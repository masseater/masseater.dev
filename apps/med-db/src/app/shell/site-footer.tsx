import { PageFooter } from "@masseater.dev/ui/page-footer";
import type { ReactNode } from "react";

import { SITE_DESCRIPTION, SITE_NAME } from "#/shared/config/index.ts";

export const SiteFooter = (): ReactNode => (
  <PageFooter variant="rule">{`${SITE_NAME} ― ${SITE_DESCRIPTION}`}</PageFooter>
);
