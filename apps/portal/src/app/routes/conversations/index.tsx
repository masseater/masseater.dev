import { createFileRoute } from "@tanstack/react-router";

import { ConversationsPage, loadConversationsPage } from "#/pages/conversations";

export const Route = createFileRoute("/conversations/")({
  loader: ({ context }) => loadConversationsPage(context.queryClient),
  component: ConversationsPage,
});
