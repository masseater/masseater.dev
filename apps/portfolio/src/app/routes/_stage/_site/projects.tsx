import { createFileRoute } from "@tanstack/react-router";

import { validateTagSearch } from "#/features/tag-filter";
import { projectsHead, ProjectsPage } from "#/pages/projects";

const Route = createFileRoute("/_stage/_site/projects")({
  validateSearch: validateTagSearch,
  head: projectsHead,
  component: ProjectsPage,
});

export { Route };
