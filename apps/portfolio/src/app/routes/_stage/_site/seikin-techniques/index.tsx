import { createFileRoute } from "@tanstack/react-router";

import { seikinIndexHead, SeikinIndexPage } from "#/pages/seikin-index/index.ts";

export const Route = createFileRoute("/_stage/_site/seikin-techniques/")({
  head: () => seikinIndexHead,
  component: SeikinIndexPage,
});
