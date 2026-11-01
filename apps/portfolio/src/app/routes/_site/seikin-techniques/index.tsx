import { createFileRoute } from "@tanstack/react-router";

import { seikinIndexHead, SeikinIndexPage } from "#/pages/seikin-index";

const Route = createFileRoute("/_site/seikin-techniques/")({
  head: () => seikinIndexHead,
  component: SeikinIndexPage,
});

export { Route };
