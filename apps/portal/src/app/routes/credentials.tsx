import { createFileRoute } from "@tanstack/react-router";

import { CredentialsPage, loadCredentialsPage } from "#/pages/credentials";

export const Route = createFileRoute("/credentials")({
  loader: ({ context }) => loadCredentialsPage(context.queryClient),
  component: CredentialsPage,
});
