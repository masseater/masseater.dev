import { Link } from "@tanstack/react-router";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { techniquePath } from "#/entities/technique";
import type { Technique } from "#/entities/technique";

const PagerLink = ({
  technique,
  label,
}: Readonly<{ technique: Option.Option<Technique>; label: string }>): ReactNode => (
  <div>
    {pipe(
      Option.toArray(technique),
      Arr.map(({ slug, name }) => (
        <Link className="flex flex-col gap-1 hover:underline" key={slug} to={techniquePath(slug)}>
          <span className="text-muted-foreground text-xs">{label}</span>
          <span>{name}</span>
        </Link>
      )),
    )}
  </div>
);

export { PagerLink };
