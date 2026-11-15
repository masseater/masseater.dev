import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PILL } from "./pill";

const ALL = "すべて";

const NO_FILTER = {} as const;

const AllProjectsItem = ({ active }: Readonly<{ active: boolean }>): ReactNode => (
  <li>
    <Link aria-current={active && "page"} className={PILL} search={NO_FILTER} to="/memos">
      {ALL}
    </Link>
  </li>
);

export { AllProjectsItem };
