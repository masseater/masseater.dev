import { createFileRoute } from "@tanstack/react-router";

import { StageLayout } from "#/app/shell/stage-layout";

const Route = createFileRoute("/_stage")({
  component: StageLayout,
});

export { Route };
