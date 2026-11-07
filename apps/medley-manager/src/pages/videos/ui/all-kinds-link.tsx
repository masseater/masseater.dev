import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { variantOf } from "#/pages/videos/lib/variant";
import { Button } from "#/shared/ui/button";

const LABEL = "すべて";

const ALL = {};

const AllKindsLink = ({ selected }: Readonly<{ selected: boolean }>): ReactNode => (
  <Button asChild size="sm" variant={variantOf(selected)}>
    <Link to="/videos" search={ALL}>
      {LABEL}
    </Link>
  </Button>
);

export { AllKindsLink };
