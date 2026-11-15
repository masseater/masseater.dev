import { createFileRoute } from "@tanstack/react-router";

import { ConversationsPage, loadConversationsPage } from "#/pages/conversations";

const Route = createFileRoute("/_watashi/conversations/")({
  loader: ({ context }) => loadConversationsPage(context.queryClient),
  component: ConversationsPage,
});

export { Route };
