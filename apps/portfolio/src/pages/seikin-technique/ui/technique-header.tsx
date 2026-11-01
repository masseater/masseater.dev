import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { COLLECTION_TITLE } from "#/entities/technique";

const TechniqueHeader = ({ name }: Readonly<{ name: string }>): ReactNode => (
  <header className="flex flex-col gap-3">
    <Link
      className="text-muted-foreground decoration-foreground/30 hover:decoration-foreground text-sm underline underline-offset-4"
      to="/seikin-techniques"
    >
      {COLLECTION_TITLE}
    </Link>
    <h1 className="font-display text-4xl leading-tight font-light text-balance sm:text-6xl">
      {name}
    </h1>
  </header>
);

export { TechniqueHeader };
