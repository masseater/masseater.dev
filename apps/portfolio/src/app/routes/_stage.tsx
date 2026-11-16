import { createFileRoute } from "@tanstack/react-router";

import { StageLayout } from "#/app/shell/stage-layout.tsx";

export const Route = createFileRoute("/_stage")({
  component: StageLayout,
});
