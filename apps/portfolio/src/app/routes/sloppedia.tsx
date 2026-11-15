import { createFileRoute } from "@tanstack/react-router";

import { wikiLayoutHead, WikiLayout } from "#/widgets/wiki-skin";

export const Route = createFileRoute("/sloppedia")({
  head: () => wikiLayoutHead,
  component: WikiLayout,
});
