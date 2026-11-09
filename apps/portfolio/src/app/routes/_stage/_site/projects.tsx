import { createFileRoute } from "@tanstack/react-router";

import { projectsHead, ProjectsPage } from "#/pages/projects";

const Route = createFileRoute("/_stage/_site/projects")({
  head: projectsHead,
  component: ProjectsPage,
});

export { Route };
