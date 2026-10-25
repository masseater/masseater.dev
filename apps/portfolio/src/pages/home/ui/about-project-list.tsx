import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

const AboutProjectList = ({ projects }: Readonly<{ projects: readonly Entry[] }>): ReactNode => (
  <ul className="flex flex-col gap-2">
    {pipe(
      projects,
      Arr.map((project) => (
        <li key={project.slug}>
          <Link className="hover:underline" params={project} to="/$category/$slug">
            {`${project.title}（${project.description}）`}
          </Link>
        </li>
      )),
    )}
  </ul>
);

export { AboutProjectList };
