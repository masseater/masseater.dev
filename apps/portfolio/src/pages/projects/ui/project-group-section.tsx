import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { ProjectGroup } from "#/pages/projects/model/projects";

import { ProjectItem } from "./project-item";

const ProjectGroupSection = ({ group }: Readonly<{ group: ProjectGroup }>): ReactNode => (
  <section className="flex flex-col gap-4">
    <h2 className="font-display text-foreground/50 text-xs tracking-widest uppercase">
      {group.title}
    </h2>
    <ul className="border-foreground/10 border-b">
      {pipe(
        group.projects,
        Arr.map((project) => <ProjectItem key={project.href} project={project} />),
      )}
    </ul>
  </section>
);

export { ProjectGroupSection };
