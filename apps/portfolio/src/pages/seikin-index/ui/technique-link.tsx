import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { techniquePath } from "#/entities/technique";
import type { Technique } from "#/entities/technique";

const TechniqueLink = ({ technique }: Readonly<{ technique: Technique }>): ReactNode => (
  <li>
    <Link className="hover:underline" to={techniquePath(technique.slug)}>
      {technique.name}
    </Link>
  </li>
);

export { TechniqueLink };
