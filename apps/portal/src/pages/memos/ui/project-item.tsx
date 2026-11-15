import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ProjectValue } from "#/entities/watashi";

import { PILL } from "./pill";

const ProjectItem = ({
  active,
  project,
}: Readonly<{ active: boolean; project: ProjectValue }>): ReactNode => {
  const search = useMemo(() => ({ project: project.project }), [project.project]);
  return (
    <li>
      <Link aria-current={active && "page"} className={PILL} search={search} to="/memos">
        {project.project}
        <span className="tabular-nums">{project.memos}</span>
      </Link>
    </li>
  );
};

export { ProjectItem };
