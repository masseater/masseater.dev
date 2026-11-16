import { createFileRoute } from "@tanstack/react-router";

import { ConversationsPage, loadConversationsPage } from "#/pages/conversations/index.ts";

export const Route = createFileRoute("/conversations/")({
  loader: ({ context }) => loadConversationsPage(context.queryClient),
  component: ConversationsPage,
});
