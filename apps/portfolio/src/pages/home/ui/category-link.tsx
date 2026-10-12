import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryMeta } from "#/entities/entry";
import type { CategoryInfo } from "#/entities/entry";

const CategoryLink = ({ info }: Readonly<{ info: CategoryInfo }>): ReactNode => (
  <li>
    <Link className="stage-link px-2 py-3" params={info} to="/$category">
      <span className={categoryMeta[info.category].titleTransition}>{info.title}</span>
    </Link>
  </li>
);

export { CategoryLink };
