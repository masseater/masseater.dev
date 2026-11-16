import { createFileRoute } from "@tanstack/react-router";

import { wikiLayoutHead, WikiLayout } from "#/widgets/wiki-skin/index.ts";

export const Route = createFileRoute("/sloppedia")({
  head: () => wikiLayoutHead,
  component: WikiLayout,
});
