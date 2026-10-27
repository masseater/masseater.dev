import { createFileRoute } from "@tanstack/react-router";

import { loadTechnique, techniqueHead, TechniquePage } from "#/pages/seikin-technique";

const Route = createFileRoute("/_site/seikin-techniques/$slug")({
  loader: ({ params }) => loadTechnique(params),
  head: ({ loaderData }) => techniqueHead(loaderData),
  component: TechniquePage,
});

export { Route };
