import { Array as Arr, Order, pipe } from "effect";
import type { ReactNode } from "react";

import { useProjects } from "#/pages/home/api/home-query";
import { sortKey } from "#/shared/model";
import { Section } from "#/shared/ui";

import { ProjectLine } from "./project-line";

const TITLE = "作業中のプロジェクト";

const SHOWN = 6;

export const ProjectsCard = (): ReactNode => (
  <Section title={TITLE}>
    <ul aria-label={TITLE} className="divide-border divide-y">
      {pipe(
        useProjects(),
        Arr.sortWith((project) => sortKey(project.updatedAt), Order.flip(Order.String)),
        Arr.take(SHOWN),
        Arr.map((project) => <ProjectLine key={project.project} project={project} />),
      )}
    </ul>
  </Section>
);
