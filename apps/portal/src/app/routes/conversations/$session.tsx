import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { ConversationSearch } from "#/entities/watashi";
import { ConversationPage, loadConversationPage } from "#/pages/conversation";

export const Route = createFileRoute("/conversations/$session")({
  validateSearch: Schema.toStandardSchemaV1(ConversationSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, params }) =>
    loadConversationPage({
      queryClient: context.queryClient,
      sessionId: params.session,
      search: deps,
    }),
  component: ConversationPage,
});
