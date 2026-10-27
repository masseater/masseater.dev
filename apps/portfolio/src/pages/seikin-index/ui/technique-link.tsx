import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { techniquePath } from "#/entities/technique";
import type { Technique } from "#/entities/technique";
import { linkClassOf } from "#/pages/seikin-index/model/progress";

const TechniqueLink = ({ technique }: Readonly<{ technique: Technique }>): ReactNode => (
  <li>
    <Link className={linkClassOf(technique.slug)} to={techniquePath(technique.slug)}>
      {technique.name}
    </Link>
  </li>
);

export { TechniqueLink };
