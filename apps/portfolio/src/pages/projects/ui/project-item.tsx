import type { ReactNode } from "react";

import type { Project } from "#/pages/projects/model/projects";

import { ProjectMeta } from "./project-meta";

const ProjectItem = ({ project }: Readonly<{ project: Project }>): ReactNode => (
  <li className="border-foreground/10 flex flex-col gap-2 border-t py-5 sm:flex-row sm:items-baseline sm:gap-8">
    <a
      className="font-display hover:text-foreground/70 shrink-0 self-start text-xl font-light transition-colors sm:w-64"
      href={project.href}
    >
      {project.name}
    </a>
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-foreground/70 text-sm">{project.description}</p>
      <ProjectMeta project={project} />
    </div>
  </li>
);

export { ProjectItem };
