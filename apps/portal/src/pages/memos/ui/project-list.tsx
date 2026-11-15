import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, Predicate, pipe } from "effect";
import type { ReactNode } from "react";

import { useProjects } from "#/pages/memos/api/memos-query";

import { AllProjectsItem } from "./all-projects-item";
import { ProjectItem } from "./project-item";

const route = getRouteApi("/_watashi/memos/");

const LABEL = "プロジェクト";

export const ProjectList = (): ReactNode => {
  const { project: active } = route.useSearch();
  return (
    <nav aria-label={LABEL}>
      <ul className="font-display flex flex-wrap gap-2 text-xs tracking-widest xl:flex-col xl:items-start">
        <AllProjectsItem active={Predicate.isUndefined(active)} />
        {pipe(
          useProjects(),
          Arr.map((project) => (
            <ProjectItem
              active={project.project === active}
              key={project.project}
              project={project}
            />
          )),
        )}
      </ul>
    </nav>
  );
};
