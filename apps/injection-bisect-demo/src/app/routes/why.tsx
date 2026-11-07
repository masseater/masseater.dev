import { createFileRoute } from "@tanstack/react-router";

import { WhyPage } from "#/pages/why";

const Route = createFileRoute("/why")({
  component: WhyPage,
});

export { Route };
