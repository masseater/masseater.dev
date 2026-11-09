import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { TagFilter, tagCounts, useTagFilter, withTag } from "#/features/tag-filter";
import { projects } from "#/pages/projects/model/projects";
import { sectionMeta } from "#/shared/config";

import { ProjectItem } from "./project-item";

const route = getRouteApi("/_stage/_site/projects");

const counts = tagCounts(projects);

const ProjectsPage = (): ReactNode => {
  const { activeTag, select } = useTagFilter({
    search: route.useSearch(),
    navigate: route.useNavigate(),
  });
  return (
    <div className="xl:collection-columns flex flex-col gap-8 xl:grid xl:items-start" data-wide>
      <h1 className="sr-only">{sectionMeta.projects.title}</h1>
      <TagFilter activeTag={activeTag} counts={counts} onSelect={select} />
      <ul className="border-foreground/10 min-w-0 border-b xl:col-start-2 xl:row-start-1">
        {pipe(
          withTag(activeTag)(projects),
          Arr.map((project) => <ProjectItem key={project.href} project={project} />),
        )}
      </ul>
    </div>
  );
};

export { ProjectsPage };
