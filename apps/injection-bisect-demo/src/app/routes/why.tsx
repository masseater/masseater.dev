import { createFileRoute } from "@tanstack/react-router";

import { WhyPage } from "#/pages/why";

export const Route = createFileRoute("/why")({
  component: WhyPage,
});
