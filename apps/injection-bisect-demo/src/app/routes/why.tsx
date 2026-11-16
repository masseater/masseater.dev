import { createFileRoute } from "@tanstack/react-router";

import { WhyPage } from "#/pages/why/index.ts";

export const Route = createFileRoute("/why")({
  component: WhyPage,
});
