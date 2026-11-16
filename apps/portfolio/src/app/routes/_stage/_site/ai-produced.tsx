import { createFileRoute } from "@tanstack/react-router";

import { aiProducedHead, AiProducedPage } from "#/pages/ai-produced/index.ts";

export const Route = createFileRoute("/_stage/_site/ai-produced")({
  head: aiProducedHead,
  component: AiProducedPage,
});
