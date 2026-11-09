import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { TEXT } from "#/pages/ranking/model/labels";

const PageHeader = (): ReactNode => (
  <header className="flex items-baseline justify-between gap-4">
    <h1 className="text-2xl font-bold">{TEXT.title}</h1>
    <Link to="/about" className="text-muted-foreground text-sm underline">
      {TEXT.about}
    </Link>
  </header>
);

export { PageHeader };
