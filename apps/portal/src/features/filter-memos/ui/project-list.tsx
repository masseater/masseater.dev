import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, Predicate, pipe } from "effect";
import type { ReactNode } from "react";

import { useProjects } from "#/features/filter-memos/api/projects-query";

import { AllProjectsItem } from "./all-projects-item";
import { ProjectItem } from "./project-item";

const route = getRouteApi("/memos/");

const LABEL = "プロジェクト";

export const ProjectList = (): ReactNode => {
  const { project: active } = route.useSearch();
  return (
    <nav
      aria-label={LABEL}
      className="bg-card flex flex-col gap-2 rounded-xl border p-3 lg:sticky lg:top-20"
    >
      <p className="text-muted-foreground px-3 pt-1 text-xs font-bold">{LABEL}</p>
      <ul className="flex flex-col gap-0.5">
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
