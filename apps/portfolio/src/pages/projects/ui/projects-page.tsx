import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { projectGroups } from "#/pages/projects/model/projects";
import { sectionMeta } from "#/shared/config";

import { ProjectGroupSection } from "./project-group-section";

const ProjectsPage = (): ReactNode => (
  <div className="flex flex-col gap-16">
    <h1 className="sr-only">{sectionMeta.projects.title}</h1>
    {pipe(
      projectGroups,
      Arr.map((group) => <ProjectGroupSection group={group} key={group.title} />),
    )}
  </div>
);

export { ProjectsPage };
