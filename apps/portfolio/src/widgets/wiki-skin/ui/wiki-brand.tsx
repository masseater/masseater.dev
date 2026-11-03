import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { WikiLogo } from "./wiki-logo";
import { WikiWordmark } from "./wiki-wordmark";

const WikiBrand = (): ReactNode => (
  <Link className="flex items-center gap-3" to="/sloppedia">
    <WikiLogo />
    <WikiWordmark />
  </Link>
);

export { WikiBrand };
