import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage, loadProfilePage } from "#/pages/profile/index.ts";

export const Route = createFileRoute("/profile")({
  loader: ({ context }) => loadProfilePage(context.queryClient),
  component: ProfilePage,
});
