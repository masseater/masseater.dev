import { Array as Arr, Order, pipe } from "effect";
import type { ReactNode } from "react";

import { useProjects } from "#/pages/home/api/home-query.ts";
import { sortKey } from "#/shared/model/index.ts";
import { Section } from "#/shared/ui/index.ts";

import { ProjectLine } from "./project-line.tsx";

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
