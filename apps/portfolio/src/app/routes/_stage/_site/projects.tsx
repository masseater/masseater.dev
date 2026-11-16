import { createFileRoute } from "@tanstack/react-router";

import { validateTagSearch } from "#/features/tag-filter/index.ts";
import { projectsHead, ProjectsPage } from "#/pages/projects/index.ts";

export const Route = createFileRoute("/_stage/_site/projects")({
  validateSearch: validateTagSearch,
  head: projectsHead,
  component: ProjectsPage,
});
